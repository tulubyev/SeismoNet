# SeismoNet — контекст для Claude

Система сейсмического мониторинга инфраструктурных объектов (Иркутск, далее — Махачкала, Алматы,
Улан-Батор). Язык UI и документации — русский; нормативная база — СП 14.13330, СНиП II-7-81*, ГОСТ 17516.1.
Заказчик/владелец — ЕЦСЭМ, «Байкальская Инновационная Компания». Подпроект АПК «Байкал».

## Команды

```bash
npm run setup            # первый запуск: npm install + .env + SSH-туннель к БД
npm run tunnel -- start  # SSH-туннель: localhost:5433 -> VPS PostgreSQL (status|stop)
npm run dev              # tsx + Vite middleware, http://localhost:5000 (PORT переопределяет)
npm run check            # tsc --noEmit (baseline ошибок см. ниже)
npm test                 # vitest: client/src/lib/numeric, shared/permissions, server/{auth,ws,lib/password,storage/*}
npm run build            # vite build -> dist/public, esbuild server -> dist/index.js
npm start                # production: node dist/index.js
npm run db:push          # drizzle-kit push — МЕНЯЕТ СХЕМУ ОБЩЕЙ БД, только осознанно
npm run db:generate      # drizzle-kit generate -> migrations/
```

`.env` читается через `node --env-file` — dotenv в коде нет. Шаблон: `.env.example`.

## База данных

**Единственная БД — `seismonet_db` на VPS 90.156.168.149**, системный PostgreSQL 16, порт 5432,
пользователь `tulubyev`. Локального PostgreSQL нет и не нужно.

- Mac: через `scripts/db-tunnel.sh` → `DATABASE_URL=postgres://tulubyev:***@localhost:5433/seismonet_db`.
- VPS (Docker): `DATABASE_URL=postgres://tulubyev:***@172.28.0.1:5432/seismonet_db` (`host.docker.internal` тоже работает).
- Снаружи 5432 закрыт UFW — поэтому Replit-деплой не мог подключиться. Не открывать порт; деплоить на VPS (`docs/DEPLOY.md`).
- `server/db.ts`: `VPS_DATABASE_URL || DATABASE_URL`, `pg.Pool`, `ssl: false`.
- Схема: `shared/schema.ts` (26 таблиц, drizzle + drizzle-zod). Миграции `migrations/0000–0005` + ad-hoc
  `runStartupMigrations()` в `server/routes.ts` (добавляет колонки `IF NOT EXISTS` при старте).
- Пока проект не задеплоен на VPS, `seismonet_db` — де-факто dev-база. После деплоя для экспериментов
  со схемой создать `seismonet_dev_db` там же и переключить `.env`.

## Архитектура

Монолит: Express 4 + React 18 (Vite) + WebSocket, один процесс, один порт.

```
server/index.ts        bootstrap, логгер запросов, Vite middleware (dev) / static (prod), listen(PORT), фоновые startup-задачи
server/routes.ts       registerRoutes(): auth → монтирование доменных роутеров → WebSocket → sync-джобы
server/routes/*.ts     express.Router по доменам, полные пути "/api/...": health, stations, monitoring (events/alerts/networks/regions),
                       notifications, earthquakes, infrastructure (+object-categories), developers, calculations (+comparison-sets),
                       soil, sensors, norms, seismograms (+miniSEED), calibration, analytics (page-views), users, audit
server/storage/*.ts    доступ к БД по доменам; index.ts собирает объект `storage: IStorage`; types.ts — интерфейс IStorage; audit.ts — аудит-лог;
                       scope.ts — SQL скоупа (customerWhere/stationInCustomer/objectInCustomer/objectIdsWhere/andAll, только через
                       db.select().from(...), НЕ db.query.*.findMany — relational API алиасит таблицу и ломает EXISTS-подзапрос, 42P01);
                       customers.ts — CRUD заказчиков
server/routes/customers.ts  /api/customers CRUD (модуль customers, только superadmin)
server/ws.ts           WebSocketServer('/ws', noServer), broadcastMessage(), симулятор волновых данных
server/startup.ts      runStartupMigrations() (ad-hoc ALTER TABLE ... IF NOT EXISTS, включая таблицу customers и customer_id/region_id),
                       initializeResearchNetworks()
server/seed.ts         seedDatabase(): стартовые данные (застройщики, нормы, станции, грунты…), идемпотентно
server/auth.ts         Passport-local, scrypt, express-session (MemoryStore dev / connect-pg-simple prod), requirePermission()
server/db.ts           pg.Pool + drizzle, объект schema
server/static.ts       log(), serveStatic() — prod-статика с immutable-кэшем /assets
server/vite.ts         dev-only, подключается динамическим импортом (в prod-бандл не попадает)
server/seismicUtils.ts STA/LTA, триангуляция, магнитуда
server/services/       earthquakeApi (USGS/EMSC), jmaEarthquakeApi, telegram, unisender — sync по setInterval 30 мин
server/lib/            miniseed.ts (энкодер miniSEED 2.4), errors.ts (describeError — одна строка на ошибку в логах)
shared/permissions.ts  роли и матрица доступа (6 ролей × модули), can(role, module, level)
shared/schema.ts       единый источник типов для клиента и сервера
client/src/App.tsx     роутер wouter; тяжёлые страницы через React.lazy; все страницы кроме /auth — в ProtectedRoute + AppLayout
client/src/pages/      24 страницы; Analysis.tsx (4 вкладки inline) + pages/analysis/{AmplificationTab,ResponseTab,ResonanceTab}.tsx;
                       Calculations.tsx + pages/calculations/{shared,CalcDetailDialog,NotesEditor,details,CompareDialog}.tsx;
                       admin/Users.tsx + pages/admin/users/{shared,CreateDialog,EditDialog,PasswordDialog,ObjectsDialog,AuditLog}.tsx;
                       admin/Customers.tsx + pages/admin/customers/{CreateDialog,EditDialog}.tsx
client/src/components/ui  shadcn/ui (new-york), только используемые компоненты
client/src/hooks/      use-auth (Context), useWebSocket, useSeismicData
client/src/lib/        queryClient, leaflet (бандл Leaflet + window.L), epicenterCalculator, seismicCalculations, waveformVisualization, mapUtils
client/src/lib/numeric/ чистые численные методы с тестами: fft (спектр, H/V), amplification (МТСМ, Thomson-Haskell),
                       responseSpectrum (Newmark-β SDOF), scenarios (каталог Байкала, синтетические акселерограммы), resonance (calcRisk)
```

Конвенции:
- Алиасы `@` → `client/src`, `@shared` → `shared`. Vite root = `client/`.
- TanStack Query: ключ кэша = URL (`['/api/stations']`), после мутаций — `invalidateQueries`.
- Zod-схемы для API берутся из `drizzle-zod` (`insertXxxSchema` в `shared/schema.ts`).
- Новый эндпоинт: метод в `server/storage/types.ts` (IStorage) + реализация в `server/storage/<domain>.ts` + роут в `server/routes/<domain>.ts`.
- Leaflet бандлится через `client/src/lib/leaflet.ts` (экспортирует `window.L` для старого кода карт).
- Роли: 6 (см. `shared/permissions.ts`) через `requirePermission(module, level)`.
- Новый маршрут обязан иметь `requirePermission(module, level)`; новая страница — `page(Component, module)` в App.tsx.
- `/ws` принимает только запросы с валидной сессией (`server/ws.ts` `authorizeUpgrade`).
- Мультитенантность: каждая tenant-таблица (`infrastructure_objects`, `stations`, `developers`, `soil_profiles`,
  `seismic_calculations`, `sensors`, `calibration_sessions`, `comparison_sets`) имеет `customer_id`; `users.customer_id`
  nullable (NULL — только у superadmin). List/detail-геттеры `IStorage` принимают `scope: Scope`
  (`{ customerId: number | null; objectIds?: number[] }`, `customerId === null` — режим «все заказчики», только для
  superadmin) — страховка `server/storage/scope-guard.test.ts`. Роуты передают `scopeOf(req)`; создание tenant-строк —
  только через `requireCustomer(req, res)` (400 `select_customer`, если заказчик не выбран) — страховка
  `server/routes/scope-guard.test.ts`. Общие (нескоуплены) таблицы: `regions`, `object_categories`, `building_norms`,
  `research_networks`, `system_status`, `page_visit_logs`, `audit_log`, а также `events` (глобальный каталог
  землетрясений — сознательно без скоупа).

## Локальная среда (Claude Desktop)

- `.claude/launch.json` → конфигурация `seismonet-dev` для браузерной панели (`preview_start`).
- Вход: форма `/auth`; в dev есть кнопка dev-login (логинит `DEV_LOGIN_USERNAME`, по умолчанию `admin`).
- Без туннеля сервер стартует, но все `/api/*` с БД отдают 500 — сначала `npm run tunnel -- start`.
- Claude не подключается к VPS по SSH и не запускает `db:push` без явной просьбы.

## Деплой

`Dockerfile` (multi-stage, node:20-alpine) + `docker-compose.prod.yml` (Traefik labels, сеть `traefik-public`).
Пошагово — `docs/DEPLOY.md`. Инфраструктура сервера описана в репо `tulubyev/vps-server-infra`.

## Направление проекта

- Аппаратные узлы: списанные инфоматы «Искра» → Raspberry Pi 4/5 + MEMS-акселерометр (ADXL345 пилот,
  ADXL357/промышленные MEMS далее), данные в miniSEED, регистрация в FDSN.
- Мультирегиональность: Иркутск (ИЗК СО РАН), Махачкала (ГАУ РД «Сейсмобезопасность»), Алматы, Улан-Батор (ИАГ МАН).
  Сейчас UI, seed и тексты жёстко про Иркутск — таблица `regions` есть, но не используется как измерение.
- Продуктовый backlog: `docs/проект_доработок.md` (PDF на кириллице, PDF для МТСМ, страница `/map`,
  статус датчиков по зданию, экспорты CSV/Excel, живые счётчики на HomePage).
- Технический backlog: `docs/INFRASTRUCTURE.md` (TimescaleDB,
  MQTT/Kafka ingest, Redis, наблюдаемость). Планы: `docs/opensees-integration-plan.md`, `docs/task-*.md`.
- История изменений: `docs/COMPLETED_FEATURES.md`. Архитектура: `docs/ARCHITECTURE.md`.

## Известные проблемы / TODO

- Безопасность: лимитер попыток входа (server/auth.ts) — в памяти процесса; осознанно, пока один инстанс.
  Аудит-лог пишет только users API и успешные логины.
- Роли: 6 по спецификации, enum пересоздан миграцией 0006.
- Симулятор данных в `server/ws.ts` (`startSimulation`) шлёт синтетические волны для станций
  `PNWST-03`, `SOCAL-12`, `ALASKA-07` и может слать реальные Telegram-алерты о батарее.
- CI нет; тесты только для `lib/numeric` и части server/shared (см. `npm test` выше). `npm run check` — baseline
  45 ошибок типов (20.09.2026), все в старом коде (routes/*, страницы); часть из-за отсутствия `target` в tsconfig
  (TS1252/TS2802). Не ухудшать; чинить отдельной задачей.
- Replit-артефакты удалены 16.09.2026; резервная копия 65 Replit-веток — `../SeismoNet-replit-branches.bundle`
  (вне репо). Локальные ветки/remotes `subrepl-*` и `replit-agent` удалить руками (см. README → «Чистка»).
- Мультитенантность (2026-09-19): RLS не включена — изоляция только на уровне SQL-скоупа в `server/storage`,
  «второе кольцо» RLS — сознательно отложено. В клиенте нет формы создания/редактирования инфраструктурных
  объектов (соответственно нет и выбора региона в форме объекта — регион проставляется бэкендом). Роута
  `POST /api/stations` не существует. Линейные объекты (трубопроводы) заводятся как точки с типом `pipeline`;
  геометрия линий — будущая доработка.
