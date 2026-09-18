# Деплой SeismoNet на VPS

Сервер: `90.156.168.149` (Ubuntu, Traefik v2.11, системный PostgreSQL 16). Схема и правила — в репо
[`tulubyev/vps-server-infra`](https://github.com/tulubyev/vps-server-infra) (`docs/NEW-PROJECT.md`, Вариант A — полный Docker).

SeismoNet — один процесс (API + статика + WebSocket `/ws` на одном порту 5000), поэтому один контейнер.
Traefik подхватывает его по labels из `docker-compose.prod.yml`, сертификат выдаёт Let's Encrypt.

## Почему не Replit

Replit Autoscale — внешний хост; порт 5432 на VPS закрыт снаружи (UFW), все проекты ходят в PostgreSQL
изнутри сервера (`172.28.0.1` из Docker). Отсюда `connect ETIMEDOUT 90.156.168.149:5432` и пустые
`/api/stations`. Открывать 5432 в интернет не нужно — приложение переезжает на VPS.

## Первый деплой

```bash
# 0. DNS: seismonet.ru и www.seismonet.ru → A 90.156.168.149 (TTL можно снизить заранее)

# 1. Код
sudo mkdir -p /var/www/seismonet && sudo chown $USER /var/www/seismonet
git clone https://github.com/tulubyev/SeismoNet.git /var/www/seismonet
cd /var/www/seismonet

# 2. Окружение
cp .env.example .env
nano .env
#   DATABASE_URL=postgres://tulubyev:<пароль>@172.28.0.1:5432/seismonet_db
#   SESSION_SECRET=$(openssl rand -hex 32)
#   NODE_ENV=production
#   PORT=5000
#   TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID / UNISENDER_API_KEY — по необходимости

# 3. База уже существует (seismonet_db, см. Database_Merge.md). Если схема отстала:
#    docker compose -f docker-compose.prod.yml run --rm seismonet \
#      node node_modules/drizzle-kit/bin.cjs push      # drizzle-kit есть только в build-стадии —
#    проще выполнить `npm run db:push` с Mac через туннель ДО деплоя.

# 4. Запуск
docker compose -f docker-compose.prod.yml up -d --build

# 5. Проверка
docker compose -f docker-compose.prod.yml ps
docker logs -f seismonet-app | head -30        # ждём "serving on port 5000"
curl -s https://seismonet.ru/api/health        # {"status":"ok","db":"up",...}
curl -s https://seismonet.ru/api/stations | head -c 300
```

Сессии в production хранятся в таблице `session` (создаётся автоматически `connect-pg-simple`),
поэтому рестарт контейнера не разлогинивает пользователей.

## Обновление

```bash
cd /var/www/seismonet
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker image prune -f
```

После выкладки релиза roles-polish все пользователи будут разлогинены: изменился формат сессии
(`passport.user` теперь `{id, epoch}` вместо просто `id`), старые сессии не проходят десериализацию
и отклоняются автоматически — `DELETE FROM session` делать не нужно. Отдельная миграция схемы
тоже не требуется: `session_epoch`, `audit_log` и два уникальных индекса по `lower()` создаются
`runStartupMigrations()` при старте контейнера — проверить это можно по строке
`Startup migrations applied` в логе (`docker logs seismonet-app`).

## Обновление с ролями

Миграция 0006 (6 ролей + `user_objects`) применяется **до** выкладки кода, с Mac через туннель —
на VPS в build-стадии `drizzle-kit` нет. Миграция необратима вперёд (forward-only): в файле нет
`DOWN`-скрипта, откат — только восстановлением дампа БД, снятого до `migrate:roles`.

```bash
# 1. Mac: туннель поднят, .env указывает на localhost:5433
npm run migrate:roles          # печатает гистограмму ролей и список перехэшированных логинов

# 2. VPS pre-flight: SESSION_SECRET должен быть задан и не тривиален, иначе сервер не стартует
ssh tulubyev@90.156.168.149 \
  "grep -q '^SESSION_SECRET=.\{16,\}' /var/www/seismonet/.env || echo 'SESSION_SECRET missing — server will not start'"

# 3. Mac: отдать код
git push

# 4. VPS
cd /var/www/seismonet && git pull && docker compose -f docker-compose.prod.yml up -d --build

# 5. Mac (через туннель): сбросить все сессии, минуя открытый dev-login старой версии —
#    сессия, выпущенная им, живёт до 24 ч и иначе останется валидной после апгрейда
psql "$DATABASE_URL" -c 'DELETE FROM session;'

# 6. Mac: dev-login должен быть недоступен в production
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://seismonet.ru/api/dev-login   # → 404
```

## После первого деплоя

- [ ] `vps-server-infra/docs/Projects.md`: перенести seismonet из «in development» в «Active Web Services»
      (`seismonet.ru | SeismoNet | Express + React (Docker) | internal | seismonet_db`).
- [ ] `vps-server-infra/docs/Server_State.md`: добавить строку в дерево Traefik и путь `/var/www/seismonet`.
- [ ] Отключить Replit Autoscale deployment, чтобы не платить за пустой инстанс.
- [ ] Сменить пароль пользователя `tulubyev` в PostgreSQL — он лежал в открытом виде в публичном
      infra-репо (`docker/postgres-projects/docker-compose.yml`) и в чатах. После смены обновить
      `.env` всех проектов на VPS и `.env` на Mac.
- [x] `/api/dev-login` регистрируется только при `NODE_ENV === 'development'` (см. `server/auth.ts`,
      `if (isDev) { app.post("/api/dev-login", ...) }`) — в production маршрут не существует, убирать нечего.
      `requireRole` из кода удалён целиком; доступ проверяет `requirePermission(module, level)` (см. `docs/ARCHITECTURE.md`).

## Локальная разработка (Mac) с той же БД

```bash
npm run tunnel -- start      # ssh -L 5433:localhost:5432 tulubyev@90.156.168.149
npm run dev                  # DATABASE_URL=postgres://tulubyev:***@localhost:5433/seismonet_db
```

`npm run db:push` с Mac меняет схему **той же** базы, что и продакшен — запускать осознанно.
Для экспериментов со схемой: `psql -h localhost -p 5433 -U tulubyev -c 'CREATE DATABASE seismonet_dev_db'`
и переключить `DATABASE_URL` в `.env`.
