// SP 14.13330.2018 — Каталог нормативных акселерограмм (реальных землетрясений),
// масштабированных к расчётным значениям PGA по Таблицам 3 и 4.
//
// Таблица 3 (расчётная сейсмичность, MSK-64 → PGA на скальном основании):
//   I = VI   → A0 = 0.05 g  ( 50 см/с²)
//   I = VII  → A0 = 0.10 g  (100 см/с²)
//   I = VIII → A0 = 0.20 g  (200 см/с²)
//   I = IX   → A0 = 0.40 g  (400 см/с²)
//
// Таблица 4 (коэффициенты грунтовых условий K_грунт):
//   I категория  — 0.8   (скальные грунты)
//   II категория — 1.0   (плотные пески, твёрдые глины)
//   III категория — 1.4  (рыхлые пески, мягкие глины)
//
// Для каждой записи указан реальный исторический прототип (Mw, эпицентральное
// расстояние, преобладающий период, длительность сильного движения) — параметры
// заимствованы из открытых баз PEER NGA-West2, K-NET и каталога ИЗК СО РАН.
// Само временное представление синтезируется из этих параметров (узкополосный
// шум с трапециевидной огибающей) и затем нормируется к нормативному PGA.

export type SeismicIntensity = 'VII' | 'VIII' | 'IX';

export interface NormativeAccelerogram {
  id: string;
  label: string;          // Краткое имя для выпадающего списка
  source: string;         // Прототип: землетрясение, станция, год
  intensity: SeismicIntensity;
  PGA_g: number;          // Целевой PGA по СП 14, Табл. 3 (доли g)
  Mw: number;             // Магнитуда прототипа
  R_km: number;           // Эпицентральное расстояние прототипа, км
  T_dom: number;          // Преобладающий период, с
  duration_s: number;     // Длительность сильной фазы, с
  soilCategory: 'I' | 'II' | 'III';
  notes: string;
}

// ─── Записи для расчётной интенсивности VII (PGA = 0.10 g) ────────────────────
const VII: NormativeAccelerogram[] = [
  {
    id: 'sp14_vii_elcentro',
    label: 'El Centro 1940 NS → СП14/VII (0.10g)',
    source: 'Imperial Valley 1940, ст. El Centro Array #9, NS',
    intensity: 'VII', PGA_g: 0.10, Mw: 6.95, R_km: 12,
    T_dom: 0.55, duration_s: 25, soilCategory: 'II',
    notes: 'Классический эталонный акселерограмма; средние периоды, 25 с сильной фазы.',
  },
  {
    id: 'sp14_vii_tunka',
    label: 'Тункинское 2008 → СП14/VII (0.10g)',
    source: 'Тункинская впадина 27.08.2008, ст. Кырен, EW',
    intensity: 'VII', PGA_g: 0.10, Mw: 6.3, R_km: 90,
    T_dom: 0.30, duration_s: 18, soilCategory: 'II',
    notes: 'Региональное событие Байкальской рифтовой зоны; средне-короткие периоды.',
  },
  {
    id: 'sp14_vii_irpinia',
    label: 'Irpinia 1980 → СП14/VII (0.10g)',
    source: 'Irpinia (Italy) 1980, ст. Sturno, NS',
    intensity: 'VII', PGA_g: 0.10, Mw: 6.9, R_km: 30,
    T_dom: 0.60, duration_s: 30, soilCategory: 'II',
    notes: 'Длиннопериодное воздействие, протяжённая сильная фаза.',
  },
  {
    id: 'sp14_vii_montenegro',
    label: 'Montenegro 1979 → СП14/VII (0.10g)',
    source: 'Montenegro 1979, ст. Petrovac, NS',
    intensity: 'VII', PGA_g: 0.10, Mw: 6.9, R_km: 25,
    T_dom: 0.40, duration_s: 22, soilCategory: 'II',
    notes: 'Среднечастотный спектр, типичный для зон средней сейсмичности.',
  },
];

// ─── Записи для расчётной интенсивности VIII (PGA = 0.20 g) ───────────────────
const VIII: NormativeAccelerogram[] = [
  {
    id: 'sp14_viii_kobe',
    label: 'Кобе 1995 JMA NS → СП14/VIII (0.20g)',
    source: 'Hyogo-ken Nanbu 17.01.1995, ст. JMA Kobe, NS',
    intensity: 'VIII', PGA_g: 0.20, Mw: 6.9, R_km: 18,
    T_dom: 0.45, duration_s: 20, soilCategory: 'II',
    notes: 'Классическая разрушительная запись. Использована в 1000+ научных работах.',
  },
  {
    id: 'sp14_viii_northridge',
    label: 'Нортридж 1994 → СП14/VIII (0.20g)',
    source: 'Northridge 17.01.1994, ст. Sylmar – Olive View, NS',
    intensity: 'VIII', PGA_g: 0.20, Mw: 6.7, R_km: 16,
    T_dom: 0.35, duration_s: 18, soilCategory: 'II',
    notes: 'Импульсный характер near-fault, высокие ускорения средних частот.',
  },
  {
    id: 'sp14_viii_spitak',
    label: 'Спитак 1988 → СП14/VIII (0.20g)',
    source: 'Спитак (Армения) 07.12.1988, ст. Гукасян, EW',
    intensity: 'VIII', PGA_g: 0.20, Mw: 6.8, R_km: 25,
    T_dom: 0.50, duration_s: 22, soilCategory: 'II',
    notes: 'Прототип для расчётов в условиях континентальных рифтов.',
  },
  {
    id: 'sp14_viii_chuya',
    label: 'Чуйское 2003 → СП14/VIII (0.20g)',
    source: 'Чуйское (Горный Алтай) 27.09.2003, ст. Кош-Агач',
    intensity: 'VIII', PGA_g: 0.20, Mw: 7.3, R_km: 95,
    T_dom: 0.55, duration_s: 35, soilCategory: 'II',
    notes: 'Региональный прототип Сибири; длительное сильное движение.',
  },
  {
    id: 'sp14_viii_loma',
    label: 'Лома Приета 1989 → СП14/VIII (0.20g)',
    source: 'Loma Prieta 17.10.1989, ст. Corralitos, NS',
    intensity: 'VIII', PGA_g: 0.20, Mw: 6.9, R_km: 7,
    T_dom: 0.30, duration_s: 16, soilCategory: 'I',
    notes: 'Запись на скальных грунтах (I категория), широкополосный спектр.',
  },
];

// ─── Записи для расчётной интенсивности IX (PGA = 0.40 g) ─────────────────────
const IX: NormativeAccelerogram[] = [
  {
    id: 'sp14_ix_tabas',
    label: 'Табас 1978 → СП14/IX (0.40g)',
    source: 'Tabas (Iran) 16.09.1978, ст. Tabas, LN',
    intensity: 'IX', PGA_g: 0.40, Mw: 7.4, R_km: 17,
    T_dom: 0.60, duration_s: 30, soilCategory: 'II',
    notes: 'Эталон для проектных нагрузок в зонах с интенсивностью IX.',
  },
  {
    id: 'sp14_ix_kobe_takatori',
    label: 'Кобе/Takatori 1995 → СП14/IX (0.40g)',
    source: 'Hyogo-ken Nanbu 1995, ст. Takatori, NS',
    intensity: 'IX', PGA_g: 0.40, Mw: 6.9, R_km: 4.3,
    T_dom: 1.20, duration_s: 25, soilCategory: 'III',
    notes: 'Near-fault impulse на мягких грунтах; критичен для высоких зданий.',
  },
  {
    id: 'sp14_ix_landers',
    label: 'Ландерс 1992 → СП14/IX (0.40g)',
    source: 'Landers 28.06.1992, ст. Lucerne, NS',
    intensity: 'IX', PGA_g: 0.40, Mw: 7.3, R_km: 1.1,
    T_dom: 0.80, duration_s: 28, soilCategory: 'I',
    notes: 'Сильнейшая компонента; длительная фаза, скальное основание.',
  },
  {
    id: 'sp14_ix_chichi',
    label: 'Чи-Чи 1999 → СП14/IX (0.40g)',
    source: 'Chi-Chi (Taiwan) 21.09.1999, ст. TCU068, NS',
    intensity: 'IX', PGA_g: 0.40, Mw: 7.6, R_km: 0.3,
    T_dom: 1.50, duration_s: 40, soilCategory: 'II',
    notes: 'Длиннопериодный near-fault impulse; экстремальный сценарий.',
  },
  {
    id: 'sp14_ix_neftegorsk',
    label: 'Нефтегорск 1995 → СП14/IX (0.40g)',
    source: 'Нефтегорск (Сахалин) 27.05.1995, восстановл. запись',
    intensity: 'IX', PGA_g: 0.40, Mw: 7.1, R_km: 30,
    T_dom: 0.50, duration_s: 25, soilCategory: 'II',
    notes: 'Российский прототип катастрофического события (≈ I=IX в эпицентре).',
  },
];

export const SP14_ACCELEROGRAMS: NormativeAccelerogram[] = [...VII, ...VIII, ...IX];

export const SP14_BY_INTENSITY: Record<SeismicIntensity, NormativeAccelerogram[]> = {
  VII, VIII, IX,
};

// PGA по Таблице 3 СП 14.13330.2018 (доли g) для расчётной сейсмичности.
export const SP14_PGA_TABLE3: Record<SeismicIntensity, number> = {
  VII: 0.10, VIII: 0.20, IX: 0.40,
};

// Коэффициенты грунтовых условий по Таблице 4 СП 14.13330.2018.
export const SP14_SOIL_K_TABLE4: Record<'I' | 'II' | 'III', number> = {
  I: 0.8, II: 1.0, III: 1.4,
};

// ─── Нормативный спектр динамичности β(T) по СП 14.13330.2018, §5.5 ──────────
// Зависит от категории грунта по сейсмическим свойствам (Табл. 4).
//   I, II категории: плато до T = 0.4 с, далее β = 2.5·(0.4/T)^0.5
//   III категория  : плато до T = 0.8 с, далее β = 2.5·(0.8/T)^0.5
// На малых периодах (T < 0.1 с) — линейный подъём от 1.0 до 2.5.
// Минимально β_min = 0.8 (нормативное ограничение снизу).
export function sp14BetaT(T: number, soilCategory: 'I' | 'II' | 'III'): number {
  const Tplato = soilCategory === 'III' ? 0.8 : 0.4;
  const BETA_MAX = 2.5, BETA_MIN = 0.8;
  let beta: number;
  if (T <= 0.1) beta = 1.0 + (BETA_MAX - 1.0) * (T / 0.1);
  else if (T <= Tplato) beta = BETA_MAX;
  else beta = BETA_MAX * Math.sqrt(Tplato / T);
  return Math.max(BETA_MIN, beta);
}

// K1 — коэффициент допускаемых повреждений (СП 14.13330.2018, Табл. 5).
// Используется при формировании расчётных нагрузок (Sa_design = A·β·K_грунт·K1).
// По умолчанию K1 = 1.0 — упругий «огибающий» спектр без снижения.
//   1.0  — для сооружений, где повреждения недопустимы
//   0.35 — типовые здания I уровня ответственности
//   0.25 — гражданские здания
export const SP14_K1_TABLE5: Record<'elastic' | 'critical' | 'normal' | 'residential', number> = {
  elastic:    1.00,
  critical:   1.00,
  normal:     0.35,
  residential:0.25,
};

// K2 — коэффициент, учитывающий конструктивное решение здания
// (СП 14.13330.2018, Табл. 6). Применяется при формировании сейсмических
// нагрузок: S = K1·K2·A·β·...
//   1.5 — каркасные здания без диафрагм/связей
//   1.3 — каркасные с диафрагмами/связями
//   1.0 — стеновые системы из крупных блоков, монолитные ж/б
//   0.8 — деревянные здания
//   0.7 — здания из кирпичной/каменной кладки специальной комплексной защиты
export const SP14_K2_TABLE6: Record<'frame_no_braces' | 'frame_braced' | 'wall_monolithic' | 'timber' | 'masonry_protected', number> = {
  frame_no_braces:    1.5,
  frame_braced:       1.3,
  wall_monolithic:    1.0,
  timber:             0.8,
  masonry_protected:  0.7,
};

// Полный нормативный спектр Sa_design(T), м/с² по СП 14.13330.2018, §5:
//   Sa = A0 · g · K_грунт · K1 · K2 · β(T)
// K2 — коэффициент конструктивного решения здания (Табл. 6); по умолчанию 1.0.
export function sp14DesignSpectrum(
  periods: number[],
  intensity: SeismicIntensity,
  soilCategory: 'I' | 'II' | 'III',
  K1: number = 1.0,
  K2: number = 1.0,
): { T: number; Sa_design: number }[] {
  const g = 9.80665;
  const A0 = SP14_PGA_TABLE3[intensity];
  const Ksoil = SP14_SOIL_K_TABLE4[soilCategory];
  const A = A0 * Ksoil * K1 * K2 * g;
  return periods.map(T => ({ T, Sa_design: A * sp14BetaT(T, soilCategory) }));
}

// Синтез временной формы сигнала по параметрам прототипа.
// Узкополосный отфильтрованный шум вокруг T_dom + трапециевидная огибающая,
// затем нормировка к (PGA_g × K_грунт) × g, м/с².
export function synthesizeSP14Accelerogram(
  rec: NormativeAccelerogram,
  opts: { sampleRate?: number; soilCategory?: 'I' | 'II' | 'III'; phaseTag?: string } = {},
): { signal: Float64Array; sampleRate: number; pga_ms2: number } {
  const sr = opts.sampleRate ?? 200;
  const soil = opts.soilCategory ?? rec.soilCategory;
  const N = Math.max(64, Math.round(rec.duration_s * sr));
  const dt = 1 / sr;
  const arr = new Float64Array(N);

  // Детерминированный псевдослучайный поток (воспроизводимость по id + phaseTag).
  // phaseTag позволяет получить статистически некоррелированные реализации
  // фазы (для пары ортогональных горизонталей H1/H2) при сохранении той же
  // целевой PGA и формы спектра.
  const seedKey = rec.id + (opts.phaseTag ?? '');
  let seed = seedKey.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0xC0FFEE);
  const rnd = () => { seed = (seed * 1664525 + 1013904223) | 0; return (seed >>> 0) / 0xFFFFFFFF; };
  for (let i = 0; i < N; i++) arr[i] = rnd() * 2 - 1;

  // Полосовой фильтр (HP+LP) вокруг доминантного периода.
  const f_low  = Math.max(0.5 / rec.T_dom, 0.10);
  const f_high = Math.min(3.0 / rec.T_dom, sr / 2 - 1);
  const rc_hi = 1 / (2 * Math.PI * f_low  * dt);
  const rc_lo = 1 / (2 * Math.PI * f_high * dt);
  const a_hi = rc_hi / (rc_hi + 1);
  const a_lo = 1     / (rc_lo + 1);
  let prev = arr[0], prevOut = arr[0];
  for (let i = 1; i < N; i++) { const o = a_hi * (prevOut + arr[i] - prev); prev = arr[i]; prevOut = o; arr[i] = o; }
  let lp = arr[0];
  for (let i = 1; i < N; i++) { lp = a_lo * arr[i] + (1 - a_lo) * lp; arr[i] = lp; }

  // Огибающая Boore: ramp 15 % / sustain 50 % / exp-decay 35 %.
  const t_rise = 0.15 * rec.duration_s;
  const t_end  = 0.65 * rec.duration_s;
  for (let i = 0; i < N; i++) {
    const t = i * dt;
    let env = 1;
    if (t < t_rise) env = t / t_rise;
    else if (t > t_end) env = Math.exp(-3 * (t - t_end) / Math.max(1e-3, rec.duration_s - t_end));
    arr[i] *= env;
  }

  // Нормировка к нормативному PGA с учётом коэффициента грунта.
  const g = 9.80665;
  const peak = arr.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const targetPGA = rec.PGA_g * SP14_SOIL_K_TABLE4[soil] * g;
  if (peak > 0) for (let i = 0; i < N; i++) arr[i] = (arr[i] / peak) * targetPGA;

  return { signal: arr, sampleRate: sr, pga_ms2: targetPGA };
}

// Пара ортогональных горизонтальных компонент H1, H2 для одной нормативной
// записи. Используется в режиме «геометрическое среднее горизонталей» по
// СП 14.13330 — даёт ориентационно-инвариантную кривую, напрямую сопоставимую
// с проектным спектром. Обе компоненты:
//   • имеют один и тот же целевой PGA и K_грунт,
//   • узкополосны вокруг одного и того же T_dom (общая форма спектра),
//   • статистически некоррелированы по фазе (разные phaseTag → разные
//     псевдослучайные последовательности),
// что воспроизводит свойство пары независимых горизонтальных регистраций.
export function synthesizeSP14HorizontalPair(
  rec: NormativeAccelerogram,
  opts: { sampleRate?: number; soilCategory?: 'I' | 'II' | 'III' } = {},
): { h1: Float64Array; h2: Float64Array; sampleRate: number; pga_ms2: number } {
  const a = synthesizeSP14Accelerogram(rec, { ...opts, phaseTag: 'H1' });
  const b = synthesizeSP14Accelerogram(rec, { ...opts, phaseTag: 'H2' });
  return { h1: a.signal, h2: b.signal, sampleRate: a.sampleRate, pga_ms2: a.pga_ms2 };
}
