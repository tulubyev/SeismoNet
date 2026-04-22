# OpenSeesPy Integration Plan — Анализ поведения конструкций

## Контекст и цель

Существующий стек (`Analysis.tsx`) реализует три класса расчётов на клиентской стороне (JavaScript):
- **FFT** — Кули-Тьюки, radix-2 DIT (in-place, `fftInPlace()`)
- **МТСМ** — передаточная функция 1D SH-волн, метод Томпсона–Хаскелла, `computeAmplification()`
- **SDOF** — спектр отклика методом Ньюмарка-β (β=¼, γ=½), `responseSpectrum()`

Всё это — одна степень свободы и линейный грунт. OpenSeesPy добавит **нелинейную МДОС-динамику конструкций** (много степеней свободы, pushover, time-history).

---

## Этап 1 — МДОС на JS/TS (без Python, без OpenSeesPy)

### Научное обоснование

#### 1.1 Модель «сдвиговое здание» (Shear Building Model)

Здание с N этажами моделируется как N-степенная система с массами mᵢ (этажные массы) и сдвиговыми жёсткостями kᵢ (стойки этажа). Уравнение движения в матричной форме:

```
[M]{ü} + [C]{u̇} + [K]{u} = -{M}{1}·üg(t)
```

где:
- `[M]` — диагональная матрица масс (mᵢ = ρ·Aᵢ·hᵢ)
- `[K]` — трёхдиагональная матрица жёсткостей (kᵢ = 12EI/h³, или по нормированной формуле)
- `[C]` — матрица демпфирования Рэлея: C = αM + βK (α, β из двух частот и ζ=5%)
- `{1}` — единичный вектор влияния (горизонтальная нагрузка)
- üg — ускорение основания (акселерограмма)

**Ссылки:**
- Chopra A.K. «Dynamics of Structures» (4th ed., 2012), гл. 12–13
- Clough R.W., Penzien J. «Dynamics of Structures», §13
- СП 14.13330.2018, п. 5.4 (метод динамического анализа)

#### 1.2 Собственные частоты и формы

Задача на собственные значения: `[K] - ω²[M] = 0`.

Для симметричных N×N матриц решается итерационным методом степенных итераций (power iteration) или методом Лансоса — оба реализуемы на TypeScript за 50–100 строк кода. Собственные векторы {φᵢ} дают формы колебаний.

**Верификация:** первая частота сдвигового N-этажного здания оценивается по формуле Рэлея-Рица:

```
T₁ ≈ 0.1·N  (для рамных железобетонных зданий, СНиП, прил. 4)
T₁ ≈ Ct·H^(3/4)  (ASCE 7-16, §12.8.2.1, Ct=0.0466 для ЖБ)
```

Расхождение с численным решением не должно превышать 15% — это встроенный критерий доверия.

#### 1.3 Прямое интегрирование (метод Ньюмарка-β)

Уже реализован для SDOF (`responseSpectrum()`). Расширяется на МДОС прямым вычислением:

```
[M]·ü_{n+1} + [C]·u̇_{n+1} + [K]·u_{n+1} = -[M]{1}·üg_{n+1}

Предиктор:
  ū_{n+1} = u_n + dt·u̇_n + dt²·(0.5-β)·ün
  ū̇_{n+1} = u̇_n + dt·(1-γ)·ün

Корректор (LDLT-разложение [K̂]):
  [K̂] = [K] + γ/(β·dt)·[C] + 1/(β·dt²)·[M]
  u_{n+1} = [K̂]⁻¹ · p̂_{n+1}
```

Матрица [K̂] формируется один раз (линейная модель), затем решается СЛАУ на каждом шаге. LDLT-разложение трёхдиагональной матрицы — O(N), т.е. расчёт 20-этажного здания за 1000 шагов выполняется в браузере за 10–50 мс.

#### 1.4 Что выдаёт модель (результаты)

| Результат | Формула | Применение |
|---|---|---|
| Собственные периоды T₁..Tₙ | ω = √(λ), T=2π/ω | Сравнение с T_грунта (резонанс) |
| Максимальные этажные смещения | max|uᵢ(t)| | Межэтажный дрейф (drift ratio) |
| Межэтажный дрейф θ | θᵢ = (uᵢ-uᵢ₋₁)/hᵢ | СП 14, Предельное состояние |
| Базовая сдвиговая сила | V = Σ mᵢ·üᵢ(t) | Нагрузка на фундамент |
| Спектры этажных ускорений | FAS по каждому этажу | Нагрузки на оборудование |

#### 1.5 Критерии доверия к Этапу 1

1. **Формула Рэлея** — T₁ из числовой задачи должна совпадать с оценкой ±15%
2. **Сумма масс** — базовая сила при псевдостатике F = K·u_ref должна совпадать с суммой инерционных сил Σmᵢ·Sa
3. **Нулевое демпфирование** — при ζ=0 амплитуда не должна убывать (проверка симплектичности интегратора)
4. **Сравнение с SDOF** — для N=1 результат МДОС-расчёта должен точно совпасть с существующим `responseSpectrum()`

**Итог:** Этап 1 — это классическая аналитическая механика, проверенная 70 годами учебников. Ошибки реализации выявляются верификационными тестами. OpenSeesPy сам применяет ту же математику для линейных задач.

---

## Этап 2 — Python-микросервис с OpenSeesPy (нелинейный МКЭ)

### Что добавляет OpenSeesPy поверх Этапа 1

| Возможность | Этап 1 (МДОС JS) | Этап 2 (OpenSeesPy) |
|---|---|---|
| Линейный dynamic | ✅ | ✅ |
| Нелинейный материал (бетон, сталь) | ❌ | ✅ |
| Pushover-кривая (capacity curve) | ❌ | ✅ |
| Nonlinear time-history | ❌ | ✅ |
| Кривые хрупкости | ❌ | ✅ |
| Хаотические пластические шарниры | ❌ | ✅ |

### 2.1 Установка на VPS

```bash
# Python 3.9+ / Ubuntu 20.04+
sudo apt-get install python3-pip python3-venv -y
python3 -m venv /opt/opensees-venv
source /opt/opensees-venv/bin/activate
pip install openseespy fastapi uvicorn numpy scipy psycopg2-binary python-dotenv
```

**Требования к ресурсам:**
- RAM: 256 МБ в простое, 800 МБ–2 ГБ под расчёт 20-этажного здания
- CPU: высокое при расчёте (10–120 с), минимальное в ожидании
- Диск: ~400 МБ (Python + OpenSeesPy)
- Нет требований к GPU

**Проверка установки:**
```python
import openseespy.opensees as ops
ops.model('basic', '-ndm', 2, '-ndf', 3)
print("OpenSeesPy OK")
```

### 2.2 Архитектура микросервиса

```
VPS
├── Node.js API  (порт 5000)   ← основной сервер
├── Python FastAPI (порт 8001) ← новый микросервис
└── PostgreSQL (VPS_DATABASE_URL) ← общая БД
```

**Файлы микросервиса:**

```
server/
└── python_service/
    ├── main.py          # FastAPI + маршруты
    ├── opensees_calc.py # Логика OpenSeesPy
    ├── requirements.txt
    └── .env             # DATABASE_URL (читает из VPS env)
```

**`server/python_service/main.py`** (скелет):
```python
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional
import opensees_calc
import uuid, json

app = FastAPI(title="OpenSeesPy Microservice")

class AnalysisRequest(BaseModel):
    object_id: int           # ID из infrastructure_objects
    analysis_type: str       # "pushover" | "time_history" | "modal"
    floors: int
    floor_height: float      # м
    floor_area: float        # м²
    structural_system: str   # "frame" | "shear_wall" | "monolithic"
    concrete_grade: str      # "B25" | "B30" | "B35"
    seismic_intensity: int   # 7 | 8 | 9
    accelerogram_id: Optional[str] = None  # для time_history
    pga_g: Optional[float] = None

class AnalysisResult(BaseModel):
    job_id: str
    status: str              # "queued" | "running" | "done" | "error"
    periods: Optional[list] = None
    pushover_curve: Optional[list] = None
    drift_profile: Optional[list] = None
    base_shear_max: Optional[float] = None
    performance_level: Optional[str] = None  # "IO" | "LS" | "CP"
    error: Optional[str] = None

@app.post("/api/analysis/structural", response_model=AnalysisResult)
async def run_analysis(req: AnalysisRequest, bg: BackgroundTasks):
    job_id = str(uuid.uuid4())
    bg.add_task(opensees_calc.run_in_background, job_id, req.dict())
    return AnalysisResult(job_id=job_id, status="queued")

@app.get("/api/analysis/structural/{job_id}", response_model=AnalysisResult)
async def get_result(job_id: str):
    result = opensees_calc.get_result(job_id)
    if not result:
        raise HTTPException(404, "Job not found")
    return result

@app.get("/health")
def health(): return {"status": "ok", "opensees": "loaded"}
```

**`server/python_service/opensees_calc.py`** (скелет pushover):
```python
import openseespy.opensees as ops
import numpy as np

_jobs: dict = {}

def build_shear_frame(floors, floor_height, story_stiffness_kN_m, story_mass_t):
    """Строит N-этажную сдвиговую раму в OpenSeesPy."""
    ops.wipe()
    ops.model('basic', '-ndm', 2, '-ndf', 3)
    # Узлы
    ops.node(0, 0.0, 0.0); ops.fix(0, 1, 1, 1)
    for i in range(1, floors + 1):
        ops.node(i, 0.0, i * floor_height)
        ops.mass(i, story_mass_t, story_mass_t, 0.0)
    # Элементы (упругие beam-column)
    E = 30e6; A = 1.0; I = story_stiffness_kN_m * floor_height**3 / (12*E)
    ops.geomTransf('Linear', 1)
    for i in range(floors):
        ops.element('elasticBeamColumn', i+1, i, i+1, A, E, I, 1)

def pushover_analysis(floors, floor_height, k_kN_m, m_t, target_drift=0.04):
    """Нелинейный pushover (треугольный паттерн нагрузки)."""
    build_shear_frame(floors, floor_height, k_kN_m, m_t)
    total_h = floors * floor_height
    # Треугольный инвертированный паттерн нагрузки
    for i in range(1, floors+1):
        h_i = i * floor_height / total_h
        ops.load(i, h_i, 0.0, 0.0)
    ops.constraints('Plain'); ops.numberer('RCM')
    ops.system('BandGeneral'); ops.test('NormUnbalance', 1e-6, 25)
    ops.algorithm('Newton')
    max_disp = target_drift * total_h
    ops.integrator('DisplacementControl', floors, 1, max_disp / 200)
    ops.analysis('Static')
    curve_V, curve_D = [], []
    for _ in range(200):
        ok = ops.analyze(1)
        if ok != 0: break
        curve_D.append(ops.nodeDisp(floors, 1))
        reactions = [ops.nodeReaction(0, 1)]
        curve_V.append(abs(sum(reactions)))
    return curve_V, curve_D

def run_in_background(job_id, params):
    _jobs[job_id] = {"status": "running"}
    try:
        V, D = pushover_analysis(
            floors=params['floors'],
            floor_height=params['floor_height'],
            k_kN_m=params.get('story_stiffness', 200),
            m_t=params.get('story_mass', 100),
        )
        _jobs[job_id] = {
            "status": "done",
            "pushover_curve": [{"d": d, "V": v} for d, v in zip(D, V)],
        }
    except Exception as e:
        _jobs[job_id] = {"status": "error", "error": str(e)}

def get_result(job_id): return _jobs.get(job_id)
```

### 2.3 Запуск на VPS

```bash
# Запуск Python-сервиса как systemd-службы
cat > /etc/systemd/system/opensees.service << EOF
[Unit]
Description=OpenSeesPy Structural Analysis Microservice
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/opensees-venv
ExecStart=/opt/opensees-venv/bin/uvicorn main:app --host 127.0.0.1 --port 8001
Restart=on-failure
Environment="PYTHONPATH=/opt/opensees-service"

[Install]
WantedBy=multi-user.target
EOF
systemctl enable opensees && systemctl start opensees
```

Node.js проксирует к нему:
```typescript
// server/routes.ts — прокси-маршрут
app.post('/api/structural-analysis', requireRole(['administrator', 'user']), async (req, res) => {
  try {
    const r = await fetch('http://127.0.0.1:8001/api/analysis/structural', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.json(data);
  } catch {
    res.status(503).json({ message: 'OpenSeesPy service unavailable' });
  }
});
```

### 2.4 Заглушка (MOCK) для фронтенда — можно сделать сейчас

Можно немедленно подготовить фронтенд с заглушкой, не устанавливая Python:

```typescript
// server/routes.ts — mock endpoint
app.post('/api/structural-analysis/mock', async (req, res) => {
  const { floors = 5 } = req.body;
  // Возвращает реалистичные данные для разработки UI
  await new Promise(r => setTimeout(r, 800)); // имитация расчёта
  res.json({
    job_id: 'mock-001',
    status: 'done',
    periods: Array.from({length: Math.min(floors, 5)}, (_, i) =>
      parseFloat((0.1 * floors / (i + 1) * 0.9**i).toFixed(3))
    ),
    pushover_curve: Array.from({length: 50}, (_, i) => ({
      d: i * 0.002 * floors,
      V: 1000 * floors * (1 - Math.exp(-i * 0.15))
    })),
    drift_profile: Array.from({length: floors}, (_, i) => ({
      floor: i + 1,
      drift_ratio: 0.005 * Math.sin(Math.PI * (i + 1) / (2 * floors))
    })),
    performance_level: floors <= 10 ? 'IO' : 'LS',
  });
});
```

### 2.5 Фронтенд-компонент (заглушка → реальный)

Добавляется новая вкладка **«Конструктивный анализ»** в `Analysis.tsx` или выделяется в `StructuralAnalysis.tsx`:

```
┌─────────────────────────────────────────────────┐
│  Конструктивный анализ                          │
│                                                 │
│  Объект: [Выпадающий список] ──────────────     │
│  Тип анализа: ○ Модальный ○ Pushover ○ TH       │
│  Акселерограмма: [SP14/VII ▼]                   │
│                                                 │
│  [▶ Запустить расчёт]    ⏱ ~15–30 с             │
│                                                 │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ Периоды Tᵢ   │  │  Кривая pushover V(d)    │ │
│  │ T₁ = 0.48 с  │  │    /‾‾‾‾‾‾             │ │
│  │ T₂ = 0.17 с  │  │   /                    │ │
│  │ T₃ = 0.10 с  │  │  /                     │ │
│  └──────────────┘  └──────────────────────────┘ │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │  Профиль межэтажного дрейфа (θᵢ)        │   │
│  │  Этаж 5 ████████████ 1.2%               │   │
│  │  Этаж 4 █████████   0.9%               │   │
│  │  Этаж 3 ███████     0.7% (порог IO<1%) │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  🟢 Уровень производительности: IO (Intact)    │
│  [💾 Сохранить] [📄 PDF]                        │
└─────────────────────────────────────────────────┘
```

---

## Сводный план реализации

### Этап 1 (1–2 недели, только TypeScript)
1. Реализовать класс `ShearBuildingModel` (матрицы [M], [K], [C])
2. Решатель собственных значений (power iteration)
3. Расширить Ньюмарка-β на N-степеней свободы
4. Добавить вкладку «МДОС-анализ» с вводом параметров здания
5. Верификационные тесты (сравнение T₁ с формулой Рэлея)

### Этап 2 (3–5 недель, Python + сервер)
1. Установить OpenSeesPy на VPS
2. Написать Python FastAPI-микросервис (`server/python_service/`)
3. Добавить прокси-маршрут в Node.js (`/api/structural-analysis`)
4. Реализовать frontend с polling статуса расчёта
5. Интегрировать с карточками объектов инфраструктуры

### Текущее состояние (уже в приложении)
- ✅ FFT (Кули-Тьюки, radix-2 DIT)
- ✅ МТСМ грунта (Thomson-Haskell)
- ✅ SDOF спектр отклика (Ньюмарка-β, ζ=5%)
- ✅ СП 14.13330.2018 нормативные акселерограммы
- ❌ МДОС анализ (Этап 1)
- ❌ OpenSeesPy нелинейный МКЭ (Этап 2)

## Relevant files
- `client/src/pages/Analysis.tsx:166-316` — Thomson-Haskell + Newmark-β
- `client/src/data/sp14-accelerograms.ts` — СП 14 акселерограммы
- `server/routes.ts` — REST API
- `shared/schema.ts` — seismic_calculations, infrastructure_objects
