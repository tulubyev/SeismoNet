# SeismoNet — скорость загрузки и структура кода: замеры и план

> Статус: этапы A–D выполнены и задеплоены 16.09.2026 (коммиты 6070705, e739ff3, 1cf28c6, 95a6833). Роли — см. `2026-09-16-roles-design.md` и `../plans/2026-09-16-roles.md`.

## Context

seismonet.ru задеплоен на VPS (Docker + Traefik) 16.09.2026. Пользователь просит: найти узкие места в скорости загрузки сайта и предложить улучшения структуры кода (модульность, компактность). Замеры сделаны с Mac по HTTPS к продакшену (RTT до VPS ≈ 350 мс — это базовая задержка любого запроса) и по локальной сборке `dist/`.

Параллельно открыт вопрос модели ролей (3 в схеме vs 6 в `docs/roles-specification.md`) — архитектурная задача, решение по ней принимается отдельно (см. конец файла).

---

## Часть 1. Скорость загрузки — замеры

### Что грузит браузер при открытии seismonet.ru

| Ресурс | Размер (как отдаётся) | Сжатие | Cache-Control | Время (Mac → VPS) | Оценка |
|---|---:|---|---|---:|---|
| `/` (index.html) | 461 B | нет | `max-age=0` | 0.54 с (TTFB) | норма |
| `/assets/index-*.js` | **2 129 929 B** | **нет** | **`max-age=0`** | **15.8 с** | 🔴 главное узкое место |
| `/assets/index-*.css` | 106 296 B | нет | `max-age=0` | 0.88 с | 🟡 |
| `/api/user` | 29 B | — | — | 0.85 с | норма (401 до логина) |
| Leaflet CSS+JS с cdn.jsdelivr.net | ~150 KB | да (CDN) | да | +DNS/TLS к третьему хосту | 🟡 инжектится в рантайме из 4 компонентов |
| Chart.js 3.9 с CDN | ~200 KB | да (CDN) | да | то же | 🟡 при этом `chart.js` есть в npm (5 MB в node_modules, в бандл не попадает) |

**Итог: первый визит ≈ 17–18 с до интерактивности, повторный визит — тот же JS заново (ETag-ревалидация помогает только при 304, но браузер всё равно ходит на сервер).**

### Что даст сжатие (проверено на локальном `dist/`)

| Файл | raw | gzip -9 | brotli -11 |
|---|---:|---:|---:|
| `index-*.js` | 2 129 929 | **592 838** (÷3.6) | **477 931** (÷4.5) |
| `index.es-*.js` (jspdf/dompurify, lazy) | 150 842 | 51 305 | 45 575 |
| `index-*.css` | 106 296 | 17 484 | 14 088 |

Одно только gzip на Traefik сокращает первую загрузку с ~16 с до ~4 с при том же канале.

### Состав бандла (2.13 MB в одном чанке, 32 маршрута, `React.lazy` не используется)

| Библиотека | В бандле | Где нужна | Комментарий |
|---|---|---|---|
| recharts | да | 3 файла (Analysis, Calculations, DataAnalysis) | ~500 KB min; грузится на главной, хотя нужна только в расчётах |
| d3 (полный) | да | 2 файла | ~250 KB; используется малая часть |
| jspdf + html2canvas | да (jspdf частично lazy) | 2 файла (PDF-отчёты) | ~600 KB; нужен только по кнопке «Экспорт PDF» |
| lucide-react | tree-shaken | 49 файлов | норма |
| @radix-ui/* (25 из 47 shadcn-компонентов реально импортируются) | только используемые | — | норма для бандла, шум для репо (22 файла, ~2 000 LOC мёртвые) |
| framer-motion, react-simple-maps, world-atlas, embla, chart.js, @neondatabase, @sendgrid, @slack, memorystore | **нет** | нигде | 8 пакетов в `package.json` ради ничего; `client/public/countries-110m.json` (108 KB) — тоже никем не читается |

### API (после логина главная делает 9 запросов + WebSocket)

| Endpoint | Ответ | TTFB | Серверное время (TTFB − 0.35 с RTT) |
|---|---:|---:|---:|
| `/api/stations` | 21.8 KB | 0.89 с | ~0.5 с |
| `/api/infrastructure-objects` | 31.3 KB | 0.51 с | ~0.15 с |
| `/api/seismograms` | 73.1 KB | 0.37 с | ~0.02 с |
| `/api/earthquakes` | 53.1 KB | 0.38 с | ~0.03 с |
| `/api/sensor-installations` | 9.0 KB | 0.42 с (через туннель однажды 2.6 с) | ~0.07 с |
| остальные 8 | 1–11 KB | 0.34–0.62 с | ≤ 0.3 с |

Запросы — простые `findMany()` без N+1 (`server/storage.ts:1345`, `getInfrastructureObjects`). Ответы **тоже не сжаты** (73 KB JSON сейсмограмм → ~10 KB gzip). `pg.Pool` с дефолтами (10 соединений) — достаточно. Полученные JSON `staleTime: Infinity` (`queryClient.ts:91`) — повторных запросов нет, это хорошо.

**Вывод по API: не узкое место. Узкое место — доставка фронтенда.**

---

## Часть 2. Структура кода — что мешает модульности и компактности

| # | Проблема | Где | Объём | Влияние |
|---|---|---|---|---|
| 1 | Один файл на всю БД: `IStorage` + `MemStorage` (мёртвый, 1 000 строк) + `DatabaseStorage` + seed-данные | `server/storage.ts` | 4 750 LOC | любое изменение — навигация по 200 KB; seed-константы (застройщики, нормы, сети) перемешаны с кодом |
| 2 | Один файл на все 93 маршрута + WebSocket + симулятор + ad-hoc миграции | `server/routes.ts` | 2 084 LOC | нет границ доменов; `requireRole` расставлен вручную на 44 из 93 |
| 3 | Страница расчётов — 7 вкладок в одном компоненте, числовые методы (Newmark-β, FFT, амплификация) внутри JSX-файла | `client/src/pages/Analysis.tsx` | 2 661 LOC / 161 KB | не тестируется, не переиспользуется, тянет recharts+d3 на все страницы |
| 4 | То же для истории расчётов | `client/src/pages/Calculations.tsx` | 1 857 LOC | |
| 5 | Мёртвый код: `client/src/mobile/**`, `components/layouts/**` (дубль `layout/`), `pages/EventMap.tsx`, `pages/EventHistory.tsx` | client | 2 558 LOC | путает, попадает в tsc, часть — в бандл через импорты? (EventMap — нет, не в роутере) |
| 6 | 22 неиспользуемых shadcn-компонента | `components/ui/` | ~2 000 LOC | шум |
| 7 | Leaflet подключается вручную `<script>` из CDN в 4 местах с копипастой загрузчика; при этом `leaflet` установлен как npm-пакет | `MapPanel`, `IrkutskMap`, `EventMap`, `SoilDatabase` | 4×~15 строк | гонки загрузки, нет типов, лишний хост |
| 8 | Chart.js из CDN в `DataExchangePanel`, а `chart.js` в npm не используется; параллельно recharts и d3 — три чартовые библиотеки | client | — | выбрать одну (recharts уже основная) |
| 9 | 8 неиспользуемых зависимостей в `package.json` | — | ~85 MB node_modules, время `npm ci` в Docker | |
| 10 | 70 `console.log` в проде (22 client, 48 server), клиентский `apiRequest` логирует каждый запрос с заголовками | `lib/queryClient.ts:15-30` | — | шум в консоли, утечка структуры API |
| 11 | Нет `React.lazy` — 32 маршрута в одном чанке | `App.tsx` | — | главная тянет код PDF-экспорта и 3D-вьюера |
| 12 | Статика без `maxAge`/`immutable` | `server/static.ts:26` | 1 строка | хешированные ассеты перекачиваются |

Стиль кода в целом консистентный (shadcn + TanStack Query + drizzle-zod), проблема — в размере единиц, не в качестве.

---

## Часть 3. План улучшений (по убыванию эффект/усилие)

### Этап A — доставка фронтенда (1 день, эффект: первая загрузка 16 с → ~3 с, повторная → <1 с)

1. **Сжатие на Traefik** — один label в `docker-compose.prod.yml`:
   `traefik.http.middlewares.seismonet-compress.compress=true` и добавить `seismonet-compress` в `routers.seismonet.middlewares`. Traefik v2.11 — gzip (brotli только в v3). Сжимает и JS/CSS, и JSON API. Никакого кода.
2. **Кэш хешированных ассетов** — `server/static.ts`: `express.static(distPath, { maxAge: '1y', immutable: true, index: false })` для `/assets`, а `index.html` — `no-cache`. Vite уже ставит хеш в имя файла, инвалидация автоматическая.
3. **Code-splitting по маршрутам** — `client/src/App.tsx`: тяжёлые страницы через `React.lazy(() => import('./pages/Analysis'))` + `<Suspense>`: `Analysis`, `Calculations`, `SoilDatabase`, `InfrastructureObjects` (3D-вьюер), `Seismograms`, `Archive`, `DataAnalysis`. Главная и `/auth` — статически. Ожидаемо: начальный чанк ~600 KB raw / ~180 KB gzip.
4. **PDF-экспорт лениво** — `jspdf`/`html2canvas` импортировать динамически внутри обработчика кнопки (`await import('jspdf')`) в 2 файлах, где они используются.
5. **Leaflet из npm** — заменить 4 CDN-загрузчика на `import L from 'leaflet'` + `import 'leaflet/dist/leaflet.css'` через общий `lib/mapUtils.ts` (он уже импортирует leaflet). Один хост меньше, типы, нет гонок.
6. **`client/public/countries-110m.json`** — удалить (никем не читается).

Проверка: `curl -sI -H 'Accept-Encoding: gzip' https://seismonet.ru/assets/index-*.js` → `content-encoding: gzip`, `cache-control: public, max-age=31536000, immutable`; `npm run build` → несколько чанков; браузерная панель → Network: первая загрузка < 1 MB суммарно.

### Этап B — чистка (полдня, эффект: −6 000 LOC, −85 MB node_modules, чище tsc)

7. Удалить `client/src/mobile/**`, `client/src/components/layouts/**`, `pages/EventMap.tsx`, `pages/EventHistory.tsx` (перед удалением — `grep -rn` по импортам, у EventMap есть уникальная логика кластеризации — если нужна, перенести в `IrkutskMap`).
8. Удалить 22 неиспользуемых `components/ui/*` (список: accordion alert aspect-ratio avatar breadcrumb calendar carousel chart collapsible command context-menu drawer hover-card input-otp menubar navigation-menu pagination radio-group resizable scroll-area sidebar toggle-group).
9. `npm uninstall framer-motion react-simple-maps world-atlas embla-carousel-react chart.js @neondatabase/serverless @sendgrid/mail @slack/web-api memorystore` + их `@types`. `connect-pg-simple` теперь используется — оставить.
10. Убрать `MemStorage` из `storage.ts` (нигде не инстанцируется), вынести seed-данные в `server/seed/*.ts`.
11. `console.log` в `lib/queryClient.ts` и `use-auth.tsx` — удалить; серверные — через `log()` из `server/static.ts` только там, где несут смысл.

### Этап C — модульность сервера (1–2 дня, без изменения поведения)

12. `server/storage.ts` → `server/storage/{users,stations,events,infrastructure,soil,sensors,calculations,seismograms,calibration,analytics}.ts`, каждый экспортирует объект методов; `server/storage/index.ts` собирает `storage` с тем же интерфейсом `IStorage` — вызывающий код не меняется.
13. `server/routes.ts` → `server/routes/{stations,events,infrastructure,developers,soil,sensors,calculations,seismograms,calibration,analytics,notifications,health}.ts` как `express.Router()`, монтируются в `registerRoutes`; WebSocket + симулятор → `server/ws.ts`; `runStartupMigrations` → `server/migrations-runtime.ts`. Это же место, где потом единообразно вешать права (см. роли).

### Этап D — модульность клиента (2 дня)

14. `pages/Analysis.tsx` → `pages/analysis/{index,CalibrationTab,FourierTab,MtsmTab,FemTab,ResponseSpectrumTab,ResonanceTab,ScenariosTab}.tsx`; числовые методы → `client/src/lib/numeric/{newmark,fft,amplification}.ts` с юнит-тестами (vitest — первый тест в проекте).
15. `pages/Calculations.tsx` → `pages/calculations/{index,NotesEditor,ComparisonPanel,...}.tsx`.
16. Одна чартовая библиотека: recharts; `DataExchangePanel` перевести с CDN Chart.js на recharts; d3 оставить только для waveform-canvas (`waveformVisualization.ts`), если там реально d3-scale — иначе заменить на ручной scale.

### Что НЕ делать сейчас
- Не трогать `shared/schema.ts` и миграции (этап ролей — отдельно).
- Не переписывать на другой фреймворк/роутер.
- Не оптимизировать API — оно не узкое место.

---

## Файлы

**Этап A:** `docker-compose.prod.yml`, `server/static.ts`, `client/src/App.tsx`, `client/src/lib/mapUtils.ts`, `MapPanel.tsx`, `IrkutskMap.tsx`, `SoilDatabase.tsx`, 2 файла с jspdf, удалить `client/public/countries-110m.json`.
**Этап B:** удаления по списку, `package.json`, `server/storage.ts` (MemStorage), `queryClient.ts`, `use-auth.tsx`.
**Этап C:** `server/storage.ts` → `server/storage/*`, `server/routes.ts` → `server/routes/*`, новый `server/ws.ts`.
**Этап D:** `pages/Analysis.tsx` → `pages/analysis/*`, `pages/Calculations.tsx` → `pages/calculations/*`, `client/src/lib/numeric/*`, `vitest` в devDeps.

## Verification

- После A: curl-заголовки (gzip + immutable); `npm run build` показывает ≥ 8 чанков, главный < 700 KB raw; браузерная панель на seismonet.ru — Network: суммарно < 1 MB при первом заходе, при повторном ассеты из кэша (200 from disk cache).
- После B: `npm run check` — число ошибок ≤ 69 (baseline); `npm run build` проходит; `npm ls` без extraneous; `grep -rn "components/layouts\|/mobile/" client/src` пусто.
- После C/D: `npm run check` без новых ошибок; `npm run dev` + прогон по всем 25 страницам в браузерной панели (HomePage, Analysis все 7 вкладок, Calculations, SoilDatabase, InfrastructureObjects, Seismograms, Archive); `curl localhost:5000/api/health`; WS `/ws` отдаёт `station_status`; vitest для `lib/numeric/*` зелёный.
- Деплой каждого этапа отдельным коммитом: `git pull && docker compose -f docker-compose.prod.yml up -d --build` на VPS, затем внешняя проверка `/api/health` и сертификата.

---

## Решения пользователя (16.09.2026)

- **Объём: все этапы A–D**, последовательно, каждый этап — отдельный коммит и деплой с проверкой.
- **Роли: принята модель из `docs/roles-specification.md` — 6 ролей** (superadmin / designer / seismologist / data_analyst / device_manager / staff) с матрицей 14 модулей.

### Роли — что зафиксировано, реализация после этапа C

Факт: схема — `administrator | user | viewer`; ни сервер (`requireRole` отключён вне production, 49 маршрутов без проверок), ни клиент (`ProtectedRoute` игнорирует `requiredRole`) роли не проверяют; `staff` требует привязки пользователь↔объекты, которой нет в схеме. 7 пользователей в проде: 3 administrator, 1 user, 3 viewer.

Каркас решения (детальный дизайн и план — отдельным документом после этапа C, когда маршруты разложены по доменам):
- **одна матрица прав в `shared/permissions.ts`** (модуль × роль → `none | read | write`), из неё серверный `requirePermission(module, 'read'|'write')` и клиентский `usePermission()` + восстановленный `ProtectedRoute`;
- привязка `staff` — таблица `user_objects (user_id, object_id)`; фильтрация объектов/датчиков/событий по ней в storage;
- миграция enum вручную (`ALTER TYPE user_role ADD VALUE …`, не `db:push`); перенос: `administrator → superadmin`, остальные 4 записи — решить поимённо (`fieldtech` → `device_manager`, `researcher`/`testuser`/`Alexander` → уточнить);
- вместе с ролями закрываются auth-дыры: `dev-login` только вне production, `register` через zod без `role`, plaintext-пароли перехешировать, эндпоинты уведомлений под `requirePermission`.
