# Заказчики (мультитенантность) — дизайн (19.09.2026)

Проект обслуживает несколько географически разнесённых площадок и организаций: ЕЦСЭМ (Иркутск),
ГАУ РД «Сейсмобезопасность» (Махачкала), ИАГ МАН (Улан-Батор), нефтегазовые компании с линейной
инфраструктурой. Данные разных заказчиков должны быть разделены в одной БД, пользователи —
видеть только своего заказчика, суперадмин — переключаться между всеми.

Решения пользователя (19.09.2026): единица изоляции — **заказчик (организация)**; пользователь
принадлежит **одному** заказчику; управляет заказчиками и их пользователями **только глобальный
superadmin** (7-я роль не вводится); линейные объекты (геометрия трубопроводов) — **позже**,
в этой итерации линейный объект заводится как точка с типом `pipeline`; стартовый заказчик —
**один, «ЕЦСЭМ» (Иркутск)**, ему достаются все текущие данные.

Ветка `feature/customers`. Продолжение `2026-09-16-roles-design.md` и `2026-09-18-roles-polish-design.md`.

## 1. Механизм изоляции

Колонка `customer_id` на корневых сущностях + скоуп запроса, передаваемый во все геттеры
storage — тот же приём, что `ObjectScope` для роли `staff`, уровнем выше. Row Level Security и
схемы/БД на заказчика отклонены (см. обсуждение 19.09.2026): RLS — возможное «второе кольцо»
позже.

## 2. Данные (`shared/schema.ts`, `server/startup.ts`)

Новая таблица:

```
customers(
  id serial PK,
  code text NOT NULL UNIQUE,            -- латиница, [a-z0-9-], например ecsem, dagestan, mongolia
  name text NOT NULL,
  region_id integer NULL REFERENCES regions(id),   -- регион по умолчанию
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
)
```

`customer_id integer REFERENCES customers(id)` добавляется в:

| Таблица | NOT NULL | Как заполняется при создании |
|---|---|---|
| `users` | нет (NULL только у `superadmin`) | из формы «Создать/Изменить пользователя» |
| `infrastructure_objects` | да | из скоупа запроса |
| `stations` | да | из скоупа |
| `developers` | да | из скоупа |
| `soil_profiles` | да | из скоупа |
| `seismic_calculations` | да | из скоупа |
| `sensors` | да | из скоупа |
| `calibration_sessions` | да | из скоупа |
| `comparison_sets` | да | из скоупа (уточнение 19.09: `calc_ids` — массив, join через расчёты непрактичен) |

Производные таблицы **без** `customer_id`, фильтруются join-ом: `sensor_installations`
(station/object), `seismogram_records` (station), `events`, `alerts`, `maintenance_records`,
`waveform_data` (station), `soil_layers` (profile), `calibration_afc` (session),
`calculation_note_history` (calculation), `user_objects` (user).

Общие для всех заказчиков (без фильтра): `regions`, `object_categories`, `building_norms`,
`research_networks`, `system_status`, `page_visit_logs`, `audit_log`, wiki-страницы клиента,
внешние каталоги землетрясений (USGS/EMSC/JMA).

`infrastructure_objects.region_id integer NULL REFERENCES regions(id)` — регион объекта; при
создании по умолчанию `customers.region_id`. У `stations.region_id` то же правило.

Справочник `regions` пополняется строками «Махачкала», «Алматы», «Улан-Батор» (центр/радиус —
координаты городов, радиус 50 км, как у Иркутска).

`users.organization` (свободный текст) остаётся как есть — это должность/организация человека,
не заказчик.

## 3. Скоуп запроса (`server/auth.ts`, `server/storage/types.ts`)

```ts
export type Scope = {
  customerId: number | null;   // null = «все заказчики», только superadmin
  objectIds?: number[];        // только staff, как сейчас
};
```

`attachObjectScope` → `attachScope`, вешается на `/api` после passport:

- анонимный запрос — `req.scope` не задан (маршруты и так отвечают 401);
- `superadmin`: `customerId = req.session.customerId ?? null`;
- остальные роли: `customerId = user.customerId`; если `user.customerId` пуст — ответ
  `403 {error:"no_customer"}` на все маршруты, кроме `/api/user`, `/api/logout`, `/api/health`;
- `staff`: дополнительно `objectIds` из `user_objects` (как сейчас).

Выбор заказчика суперадмином: `PUT /api/session/customer { customerId: number | null }` →
проверяет, что заказчик существует и активен, пишет `req.session.customerId`, отвечает
обновлённым `/api/user`-payload. Выбор живёт в сессии (переживает перезагрузку страницы,
сбрасывается при логине заново). `GET /api/user` возвращает дополнительно
`customer: {id, code, name, regionId} | null` (для superadmin — выбранный) и
`customerScope: 'all' | 'one'`.

`/ws`: `authorizeUpgrade` строит тот же `Scope` из сессии; посылки станций и событий — через
скоуп.

## 4. Storage (`server/storage/*.ts`)

- `ObjectScope` заменяется на `Scope` во всех сигнатурах. Параметр `scope` становится
  **обязательным** у всех list-геттеров tenant-таблиц и производных:
  `getStations`, `getStationsByRegionId`, `getInfrastructureObjects`, `getDevelopers`,
  `getSoilProfiles`, `getSoilProfileNearCoords`, `getSensorInstallations`, `getSensors`,
  `getSeismogramRecords`, `getCalibrationSessions`, `getSeismicCalculations`,
  `getComparisonSets`, `getEvents`, `getRecentEvents`, `getAlerts`,
  `getUpcomingMaintenanceRecords`, `getMaintenanceRecords`.
- Detail-геттеры (`getStation`, `getStationByStationId`, `getInfrastructureObject`,
  `getInfrastructureObjectByObjectId`, `getDeveloper`, `getSoilProfile`, `getSensor`,
  `getSensorBySensorCode`, `getSensorInstallation`, `getSeismogramRecord`,
  `getCalibrationSession`, `getSeismicCalculation`, `getComparisonSet`, `getEvent`,
  `getEventByEventId`, `getMaintenanceRecord`) принимают `scope` и возвращают `undefined`,
  если запись принадлежит другому заказчику — маршрут отдаёт обычный 404. Update/delete-методы
  в роутах вызываются только после успешного detail-геттера (ownership-check), сами методы
  storage не меняют сигнатуру.
- Create-методы tenant-таблиц принимают `customerId` явно (`createStation(data, customerId)` и
  т.д.); роут берёт его из `req.scope.customerId`. При `customerId === null` (superadmin в
  режиме «все») роут отвечает `400 {error:"select_customer"}` — «Выберите заказчика».
- Фильтр: `customerId === null` → без условия по заказчику; иначе `customer_id = $1`, для
  производных таблиц — `EXISTS (select 1 from stations s where s.station_id = t.station_id
  and s.customer_id = $1)` либо через `object_id`. `objectIds` применяется поверх, как сейчас.
- Хелпер `server/storage/scope.ts`: `customerWhere(scope, column)`,
  `stationCustomerExists(scope, stationIdColumn)`, `objectCustomerExists(scope, objectIdColumn)`
  — единственное место, где формируется SQL скоупа.
- Страховка: `server/storage/scope.test.ts` перечисляет tenant-таблицы и проверяет, что каждый
  метод `IStorage`, возвращающий их записи, объявлен со `scope` (проверка по тексту
  `types.ts` через регулярное выражение — грубая, но ловит новый геттер без скоупа).

`seed.ts` создаёт стартовые данные только для заказчика `ecsem` (передаёт его id в
create-методы). `startSimulation` в `ws.ts` использует скоуп клиента.

## 5. Права (`shared/permissions.ts`)

Новый модуль `customers`, 16-й: `superadmin: write`, все остальные — `none`.
Тест матрицы расширяется на новый столбец. `settings`/`users`/`analytics`/`customers` —
суперадмин-эксклюзив.

## 6. API

- `GET /api/customers` — `customers:read` (список, включая неактивных, с `regionName`).
- `POST /api/customers` — `customers:write`; zod: `code` `/^[a-z0-9-]{2,32}$/`, `name` ≥ 2,
  `regionId` опционально. 409 при занятом `code`.
- `PATCH /api/customers/:id` — `name`, `regionId`, `active`. Деактивация заказчика:
  его пользователи не могут войти (`activeOrFalse` дополняется проверкой
  `customer.active`, superadmin не затрагивается); 409 при попытке деактивировать заказчика,
  выбранного в текущей сессии.
- `PUT /api/session/customer` — см. §3, `customers:read`.
- Users API: `customerId` в `createSchema` (обязателен, если `role !== 'superadmin'`; для
  `superadmin` игнорируется → NULL) и в `patchSchema`; смена роли на `superadmin` обнуляет
  `customerId`, смена с `superadmin` требует `customerId`. `GET /api/users` для superadmin в
  режиме «все» — все пользователи со столбцом заказчика; в режиме «один» — только его.
  `PUT /api/users/:id/objects` проверяет, что все объекты принадлежат заказчику пользователя.
- Аудит: `customer.create`, `customer.update`, `session.customer` (смена выбора).
- Все существующие роуты: `storage.getX()` → `storage.getX(req.scope)`; create → с
  `customerId`; update/delete → после detail-геттера со скоупом.

## 7. Клиент

- `useAuth()` отдаёт `customer` и `customerScope`; `setCustomer(id | null)` → `PUT
  /api/session/customer`, затем `queryClient.clear()` и `setQueryData(['/api/user'], …)`.
- Шапка (`AppLayout`): для superadmin — `Select` «Заказчик» (список из `/api/customers`,
  пункт «Все заказчики»); для остальных — текст с именем заказчика. В режиме «все» кнопки
  создания на страницах объектов/станций/застройщиков/грунтов/расчётов/датчиков/калибровки
  задизейблены с подсказкой «Выберите заказчика».
- `/admin/customers` (модуль `customers`): таблица (код, название, регион, активен, число
  объектов/пользователей), диалоги «Создать» и «Изменить». Плитка в `SystemManagement`.
- `/admin/users`: столбец «Заказчик»; в «Создать»/«Изменить» — `Select` заказчика,
  скрыт при роли superadmin.
- Форма объекта и станции: `Select` региона (по умолчанию регион заказчика).
- Жёстко зашитый «Иркутск» заменяется на регион заказчика: `StationList.tsx` (список
  районов — только для региона Иркутск, иначе свободный ввод), `Archive.tsx` (заголовок),
  `AppLayout.tsx` (подпись в шапке). `Partners.tsx` и wiki не трогаются.
- Список объектов/станций в режиме «все» показывает столбец «Заказчик».

## 8. Миграция (только `runStartupMigrations()`, идемпотентно)

Порядок:
1. `CREATE TABLE IF NOT EXISTS customers …`; `INSERT … ON CONFLICT (code) DO NOTHING`
   для `('ecsem', 'ЕЦСЭМ', region Иркутск)`.
2. `INSERT INTO regions … ON CONFLICT (name) DO NOTHING` для Махачкалы, Алматы, Улан-Батора.
3. Для каждой tenant-таблицы: `ADD COLUMN IF NOT EXISTS customer_id integer REFERENCES
   customers(id)`; `UPDATE … SET customer_id = (select id from customers where code='ecsem')
   WHERE customer_id IS NULL`; затем `ALTER COLUMN customer_id SET NOT NULL` (кроме `users`);
   `CREATE INDEX IF NOT EXISTS <table>_customer_id_idx`.
4. `users`: `UPDATE users SET customer_id = ecsem WHERE customer_id IS NULL AND role <> 'superadmin'`.
5. `infrastructure_objects.region_id`: `ADD COLUMN IF NOT EXISTS`, backfill Иркутск;
   `stations.region_id` NULL → Иркутск.

Откат не предусмотрен (forward-only, как 0006). Ничего не запускается вручную — всё при старте
контейнера; в логе строка `Startup migrations applied (... + customers)`.

## 9. Тесты

- `server/auth.test.ts`: `attachScope` — superadmin без выбора → `{customerId:null}`,
  superadmin с выбором → id, роль с заказчиком → id, роль без заказчика → 403, staff → +objectIds.
- `server/storage/scope.test.ts`: хелперы формируют ожидаемый SQL (через `sql` → строка);
  страховка «все геттеры со scope».
- `shared/permissions.test.ts`: 6×16.
- `server/routes/customers.test.ts` — валидация zod и 409 через мок storage.
- Runtime через туннель: два заказчика (ЕЦСЭМ + тестовый), пользователь второго не видит
  объектов первого ни по REST, ни по WS; чужой id → 404; superadmin переключается; в режиме
  «все» создание → 400; деактивированный заказчик → его пользователь получает 401.

## Вне объёма

Геометрия линейных объектов; роль «админ заказчика»; RLS; брендинг/домены по заказчику;
раздельные каталоги землетрясений; перенос объектов между заказчиками; удаление заказчика.

## Изменяемые файлы

`shared/{schema,permissions}.ts`, `server/{auth,ws,startup,seed}.ts`, `server/storage/{types,
index,scope,customers,users,stations,infrastructure,sensors,soil,calculations,seismograms,
calibration,events,monitoring,maintenance}.ts`, `server/routes/{customers,users,session}.ts` +
все доменные роутеры, `client/src/hooks/use-auth.tsx`, `client/src/components/layout/AppLayout.tsx`,
`client/src/pages/admin/{Customers.tsx,customers/*,users/*}`, формы объектов/станций,
`StationList.tsx`, `Archive.tsx`, `SystemManagement.tsx`, `App.tsx`, `CLAUDE.md`, `docs/DEPLOY.md`.
