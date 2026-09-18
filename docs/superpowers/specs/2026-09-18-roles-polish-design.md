# Roles polish — дизайн (18.09.2026)

Продолжение `2026-09-16-roles-design.md`. Закрывает отложенные замечания из ревью ветки
`feature/roles` и дыру `/ws` без логина. Ветка `feature/roles-polish`. Миграций, которые
запускает пользователь, нет — все изменения схемы идут через `runStartupMigrations()`.

## 1. `/ws` только для вошедших

- `server/auth.ts` экспортирует `sessionMiddleware` (экземпляр `express-session`, созданный в
  `setupAuth`) и `resolveSessionUser(req): Promise<SelectUser | false>` — прогоняет
  `sessionMiddleware` над «сырым» `IncomingMessage`, читает `req.session.passport.user`,
  грузит пользователя и применяет `activeOrFalse` + проверку epoch (см. §2).
- `server/ws.ts` в обработчике `upgrade`: `pathname !== '/ws'` — пропустить (Vite HMR);
  иначе `resolveSessionUser`. Нет пользователя — записать в сокет
  `HTTP/1.1 401 Unauthorized\r\n\r\n`, `socket.destroy()`, не вызывать `handleUpgrade`.
- Для `staff` вычисляется `ObjectScope` (`storage.getUserObjectIds`) и передаётся в
  `connection`; начальные посылки `STATION_STATUS` и `NETWORK_STATUS` используют
  `storage.getStations(scope)`. `broadcastMessage` не имеет вызовов — фильтрация рассылки не нужна.
- Клиент: `useWebSocket` берёт `user` из `useAuth()`; без пользователя сокет не открывается,
  при смене `user.id` (логин/логаут) — переподключение. `useSeismicData` не меняется.

## 2. Сброс пароля и деактивация убивают сессии

- `users.session_epoch integer NOT NULL DEFAULT 0` — `shared/schema.ts` + `ALTER TABLE users
  ADD COLUMN IF NOT EXISTS` в `server/startup.ts`. Drizzle-снапшоты не трогаем
  (известная рассинхронизация с 0005, см. CLAUDE.md).
- `serializeUser` → `{ id, epoch }`; `deserializeUser` → `getUser(id)`, `false` если
  пользователь отсутствует, неактивен или `sessionEpoch !== epoch`. Старые сессии с числовым
  `passport.user` считаются невалидными (после деплоя — повторный вход; `DELETE FROM session`
  не нужен).
- `storage.bumpSessionEpoch(id)` (`SET session_epoch = session_epoch + 1`). Вызывается в
  `POST /api/users/:id/password` и в `PATCH /api/users/:id` при `active: false`.
  Если цель — сам вызывающий (смена собственного пароля), после bump выполняется
  `req.login(freshUser)`, чтобы текущая сессия осталась валидной.

## 3. Аудит-лог

- Таблица `audit_log` (`startup.ts`, `CREATE TABLE IF NOT EXISTS`; `shared/schema.ts`):
  `id serial PK, at timestamptz NOT NULL DEFAULT now(), actor_id integer NULL,
  actor_username text NOT NULL, ip text, action text NOT NULL, target_type text,
  target_id integer, details jsonb`. Индекс по `at DESC`.
- `server/storage/audit.ts`: `logAudit(entry)` (insert, ошибки — в лог через `describeError`,
  не ломают запрос) и `getAuditLog(limit)`; добавить в `IStorage`.
- События: `user.create`, `user.update` (details = изменённые поля без пароля),
  `user.password_reset`, `user.objects_set` (details = objectIds), `auth.login`
  (actor = вошедший). Неудачные логины не пишем (лимитер + шум).
- `GET /api/audit?limit=N` (default 100, max 500) — `requirePermission('users','read')`,
  роутер `server/routes/audit.ts`.
- `/admin/users`: свёрнутый блок «Журнал действий» (`Collapsible`), таблица последних 50
  записей: время, кто, действие, цель. Запрос только при раскрытии.

## 4. Users API (`server/routes/users.ts`)

- «Последний активный суперадмин»: `storage.demoteOrDeactivateSuperadmin(id, patch)` в
  `db.transaction`: `SELECT id FROM users WHERE role='superadmin' AND active FOR UPDATE`;
  если цель в списке и список ≤ 1 — бросить `LastSuperadminError` (роут → 409); иначе UPDATE
  в той же транзакции. Проверка применяется только когда цель активна и является
  суперадмином (демоция неактивного суперадмина — обычный UPDATE).
- `GET /api/users/:id/objects` → 404, если пользователя нет.
- `getUserByUsername`/`getUserByEmail` сравнивают через `lower()`; уникальность при создании
  и PATCH без учёта регистра; логин (LocalStrategy) тоже без учёта регистра. Дублей в БД нет
  (проверено 18.09.2026).
- PATCH принимает дополнительно `fullName`, `email`, `organization`, `jobTitle`,
  `contactPhone` (zod, строки, `email()` для email). Клиент: диалог «Изменить» с этими
  полями + роль + активность (спека ролей §4).

## 5. Auth (`server/auth.ts`)

- Таймингово-нейтральный отказ: при неизвестном или неактивном логине выполняется
  `comparePasswords(password, DUMMY_HASH)` (константа — хэш случайной строки, вычисляется
  при старте), результат игнорируется.
- Тесты: `attachObjectScope` (staff → `{objectIds}`, другие роли → `undefined`, ошибка
  storage → `next(err)`); лимитер — вытеснение при `MAX_ENTRIES`.
- Лимитер остаётся in-memory (один инстанс). Зафиксировать в CLAUDE.md как осознанное решение.

## 6. Клиент

- `auth-page.tsx`: убрать нативный `required`; при пустых полях — сообщение «Введите логин и
  пароль» без запроса; блок ошибки `role="alert"`.
- `admin/Users.tsx`: локальный `send()` заменить на `apiRequest` из `lib/queryClient`;
  в «Создать» проверка обязательных полей (логин, ФИО, email, пароль ≥ 8) до запроса;
  диалог «Изменить» (§4); блок «Журнал действий» (§3). Файл делится: `admin/users/
  {CreateDialog,EditDialog,PasswordDialog,ObjectsDialog,AuditLog}.tsx`, `Users.tsx` — таблица.
- `vitest.config.ts`: include `*.test.{ts,tsx}`.

## 7. Документация и страховки

- Комментарий в `server/storage/{sensors,calculations,stations}.ts` у нескоупленных
  detail-геттеров; тест в `shared/permissions.test.ts`: `staff` имеет `none` на
  `sensors`, `calculations`, `stations`.
- README: формулировки про `migrate:roles` и dev-login (только `NODE_ENV=development`).
- CLAUDE.md: «Известные проблемы» — убрать «сброс пароля не завершает сессии», «нет
  аудит-лога»; лимитер — «in-memory, один инстанс, осознанно». Архитектурная карта:
  `server/storage/audit.ts`, `server/routes/audit.ts`, `client/src/pages/admin/users/`.

## Вне объёма

Страницы с нулями вместо «нет доступа» при 403 в кросс-модульных запросах (отдельный
постраничный аудит); drizzle-снапшот 0006; Redis-лимитер; UI-просмотр аудита сверх последних 50.

## Проверка

- vitest: новые тесты — `resolveSessionUser`/upgrade (мок сессии), epoch в
  `deserializeUser`, `LastSuperadminError` (мок транзакции), `logAudit` не бросает,
  `attachObjectScope`, лимитер `MAX_ENTRIES`, permissions-страховка.
- `npm run check` — не больше 49 ошибок.
- Браузерная панель через туннель: WS без логина → 401 (curl `--include` на `/ws` с
  `Upgrade`); `staff` по WS получает только свои станции; сброс пароля во второй вкладке →
  401 на следующем запросе; деактивация → то же; «Изменить» сохраняет поля; журнал
  показывает записи; логин `ADMIN` = `admin`.
