# Роли и права доступа — дизайн

Дата: 2026-09-16. Статус: на утверждении.
Основание: `docs/roles-specification.md` (6 ролей, матрица 14 модулей), решения пользователя от 16.09.2026.

## 1. Цель

Сейчас доступ не разграничен нигде: `requireRole` отключается вне production и стоит на 44 из 93 маршрутов,
`ProtectedRoute` игнорирует `requiredRole`, `/api/dev-login` и `/api/register` открыты в проде, три пароля
хранятся открытым текстом. Нужно: 6 ролей из спецификации, единая матрица прав для сервера и клиента,
привязка `staff` к объектам, управление пользователями, закрытие дыр аутентификации.

Не входит: OAuth/SSO, refresh-токены, аудит-лог, per-row права кроме staff↔объекты.

## 2. Модель

### Роли
`superadmin | designer | seismologist | data_analyst | device_manager | staff` — Postgres-enum `user_role`
пересоздаётся с этими 6 значениями (старые `administrator/user/viewer` убираются с маппингом).

### Модули (единицы прав) и что к ним относится

| Модуль | Серверные маршруты (роутер) | Клиент |
|---|---|---|
| `monitoring` | `monitoring.ts`: `/api/system/status`, `/api/networks`, `/api/alerts*`, `/api/regions*` | `/`, `/monitoring`, `/monitoring-hub`, `/seismo-live`, `/system-management` |
| `objects` | `infrastructure.ts` (объекты + категории), `developers.ts` | `/infrastructure`, `/developers` |
| `sensors` («3D-схема / датчики объекта») | `sensors.ts`: `/api/sensor-installations*`, `/api/sensors*` | вкладка датчиков объекта, `Building3DViewer` |
| `stations` («Станции и устройства») | `stations.ts`: `/api/stations*`, `/api/maintenance*` | `/stations`, `/stations/new` |
| `seismicMap` («Карта сейсмичности») | `earthquakes.ts`: `/api/earthquakes*` | карта на HomePage/Dashboard |
| `events` («История событий») | `monitoring.ts`: `/api/events*` | панели событий |
| `seismograms` | `seismograms.ts` | `/seismograms`, `/archive` |
| `spectral` («Спектральный анализ») | — (расчёт на клиенте) | `/analysis` вкладки waveforms/spectrum, `/data-analysis` |
| `soil` | `soil.ts` | `/soil-database` |
| `mtsm` («Расчёт усиления / спектры / резонанс») | `calculations.ts` (расчёты + comparison-sets) | `/calculations`, `/analysis` вкладки amplification/response/resonance |
| `norms` | `norms.ts` | `/building-norms` |
| `calibration` | `calibration.ts` | `/analysis` вкладки calibration/afc |
| `settings` | `notifications.ts` (ручная отправка email/telegram) | `/settings` |
| `users` | новый `users.ts` | новая `/admin/users` |
| `analytics` (не в спецификации) | `analytics.ts` кроме `POST /api/page-views` | журнал посещений на HomePage |

Публично без роли: `GET /api/health`, `POST /api/login`, `POST /api/logout`, `GET /api/user`,
`POST /api/page-views` (счётчик посещений). Wiki-страницы (`/about-project`, `/partners`, `/about-earthquakes`,
`/seismic-basics`, `/interesting`, `/seismonet-project`) — любому вошедшему.

### Матрица

`shared/permissions.ts` — единственный источник истины, повторяет таблицу спецификации
(`analytics`: superadmin RW, остальные none; `users`/`settings`: только superadmin):

```ts
export type Role = 'superadmin' | 'designer' | 'seismologist' | 'data_analyst' | 'device_manager' | 'staff';
export type Module = 'monitoring' | 'objects' | 'sensors' | 'stations' | 'seismicMap' | 'events' | 'seismograms'
  | 'spectral' | 'soil' | 'mtsm' | 'norms' | 'calibration' | 'settings' | 'users' | 'analytics';
export type Access = 'none' | 'read' | 'write';
export const PERMISSIONS: Record<Role, Record<Module, Access>> = { /* из docs/roles-specification.md */ };
export function can(role: Role, module: Module, level: 'read' | 'write'): boolean;
export const ROLE_LABELS: Record<Role, string>;   // русские названия для UI
```

`staff` дополнительно ограничен **объектами** (`objects: read*`): видит только объекты из `user_objects`
и всё, что к ним привязано — установки датчиков, датчики, станции этих установок, расчёты по этим объектам.

## 3. Сервер

### Middleware (`server/auth.ts`)
- `requirePermission(module, level)` заменяет `requireRole`. Без `NODE_ENV`-обхода. Не вошёл → 401,
  нет права → 403 `{ error: 'forbidden', module, level }`.
- `attachObjectScope`: для `staff` кладёт в `req.objectScope: number[]` id объектов из `user_objects`;
  для остальных `undefined` (без ограничений).
- Каждый роутер получает проверки по правилу: `GET` → `read`, `POST/PATCH/PUT/DELETE` → `write` своего модуля.
  Исключения перечислены в §2 «Публично».

### Scoping для staff (`server/storage/*`)
Методы списков принимают опциональный `scope?: { objectIds: number[] }`:
`getInfrastructureObjects`, `getInfrastructureObject`, `getSensorInstallations`, `getSensors`, `getStations`,
`getSeismicCalculations`. Роутеры передают `req.objectScope`. Записи staff и так запрещены матрицей.

### Аутентификация
- `POST /api/register` **удаляется**; пользователей создаёт superadmin через `POST /api/users`
  (валидация `insertUserSchema.omit({ password }).extend({ password: z.string().min(8) })`, поле `role` обязательно).
- `POST /api/dev-login` регистрируется только при `NODE_ENV === 'development'`; логинит реального
  пользователя из `.env` `DEV_LOGIN_USERNAME` (по умолчанию `admin`), а не захардкоженный объект.
- Пароли: только scrypt; plaintext-сравнение удаляется. Существующие plaintext-пароли перехешируются
  миграционным скриптом (§5).
- `SESSION_SECRET` обязателен в production (иначе процесс не стартует); cookie `sameSite: 'lax'`, `httpOnly`.
- Лимит попыток входа: 5 неудач / 60 с на IP+username (in-memory `Map`, без зависимостей) → 429.
- `lastLogin` обновляется при успешном входе.

### Управление пользователями (`server/routes/users.ts`, модуль `users`)
```
GET    /api/users                 список (без password)
POST   /api/users                 создать
PATCH  /api/users/:id             fullName, email, role, active, organization, jobTitle, contactPhone
POST   /api/users/:id/password    сброс пароля superadmin'ом
GET    /api/users/:id/objects     привязанные объекты (staff)
PUT    /api/users/:id/objects     { objectIds: number[] } — полная замена
```
Самого себя superadmin не может деактивировать и не может понизить, если он последний superadmin.
Старые `/api/admin`, `/api/user-info`, `PATCH /api/users/:id/role` удаляются.

## 4. Клиент

- `usePermission()` → `{ role, can(module, level) }` поверх `useAuth` и `shared/permissions.ts`.
- `ProtectedRoute` получает `module?: Module` (и `level`, по умолчанию `read`). Нет входа → `/auth`;
  нет права → страница «Нет доступа» (403) с кнопкой на главную. `requiredRole` удаляется.
- `App.tsx`: каждому маршруту проставляется модуль по таблице §2.
- HomePage и SystemManagement: плитки фильтруются через `can(module,'read')`; кнопки создания/удаления на
  страницах — через `can(module,'write')` (там, где сейчас `isAdmin`).
- `/auth`: форма логин/пароль (`loginMutation` из `use-auth.tsx` уже есть), сообщение об ошибке, кнопка
  «Войти как dev» только при `import.meta.env.DEV`.
- `/admin/users` (модуль `users`): таблица пользователей; диалоги «Создать», «Изменить» (роль/активность/поля),
  «Сбросить пароль», «Объекты» (мультивыбор инфраструктурных объектов, только для роли staff).
  Роль показывается через `ROLE_LABELS`. Ссылка — плитка в SystemManagement.
- `Sidebar`/`AppLayout` показывают `ROLE_LABELS[role]` вместо сырого значения.

## 5. Данные и миграция

`migrations/0006_roles.sql` (одна транзакция):
1. `CREATE TABLE user_objects (user_id int REFERENCES users ON DELETE CASCADE, object_id int REFERENCES infrastructure_objects ON DELETE CASCADE, PRIMARY KEY (user_id, object_id))`.
2. `ALTER TABLE users ALTER COLUMN role TYPE text`; `DROP TYPE user_role`;
   `CREATE TYPE user_role AS ENUM ('superadmin','designer','seismologist','data_analyst','device_manager','staff')`;
   `UPDATE users SET role = CASE role WHEN 'administrator' THEN 'superadmin' ELSE 'data_analyst' END`;
   `ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role, ALTER COLUMN role SET DEFAULT 'staff'`.
3. `shared/schema.ts`: enum на 6 значений, таблица `userObjects`, `insertUserObjectSchema`.

`scripts/migrate-roles.ts` (`npm run migrate:roles`, запускается один раз через туннель, до деплоя):
применяет `0006_roles.sql`, затем перехеширует пароли без точки (`admin`, `fieldtech`, `researcher`) через тот же
`hashPassword`. Идемпотентен: если тип уже содержит `superadmin` — SQL пропускается.

Порядок выкладки: `npm run migrate:roles` → `git push` → деплой. Старый контейнер после миграции продолжает
работать (enum-значения он не проверяет), поэтому окно совместимости есть.

## 6. Тесты и проверка

- vitest `shared/permissions.test.ts`: у каждой роли определены все модули; superadmin — write везде;
  staff — none для seismograms/mtsm/calibration/settings/users; designer — write objects/sensors/norms и read
  monitoring; матрица 1:1 со спецификацией.
- vitest `server/auth.test.ts`: `requirePermission` — 401 без пользователя, 403 при `none`/`read`-на-write,
  next() при достаточном праве; лимитер входа блокирует 6-ю попытку.
- Ручная проверка в браузере (dev, через туннель): под superadmin создать по пользователю каждой роли и
  staff с одним объектом; для каждого — плитки на главной, 403 на чужих страницах, API отдаёт 403,
  staff видит только свой объект в `/infrastructure` и `/api/infrastructure-objects`.
- `npm run check` — не выше baseline 49; `npm run build`; после деплоя `curl -X POST https://seismonet.ru/api/dev-login` → 404.

## 7. Затрагиваемые файлы

Создать: `shared/permissions.ts` (+test), `server/routes/users.ts`, `server/storage/userObjects.ts`,
`client/src/hooks/use-permission.ts`, `client/src/pages/admin/Users.tsx`, `client/src/pages/forbidden.tsx`,
`migrations/0006_roles.sql`, `scripts/migrate-roles.ts`, `server/auth.test.ts`.
Изменить: `shared/schema.ts`, `server/auth.ts`, `server/routes/*.ts` (все 14 — `requirePermission`),
`server/storage/{users,infrastructure,sensors,stations,calculations,types}.ts`, `client/src/lib/protected-route.tsx`,
`client/src/App.tsx`, `client/src/pages/{auth-page,HomePage,SystemManagement}.tsx`,
`client/src/components/layout/{AppLayout,Sidebar}.tsx`, `.env.example`, `docs/roles-specification.md` (статус «реализовано»), `CLAUDE.md`.
