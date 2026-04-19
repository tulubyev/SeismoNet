# Инфраструктурные рекомендации (нагрузка 80 станций × 20–40 датчиков)

## 1. Оценка нагрузки

При **80 станциях × 20–40 датчиков = 1600–3200 каналов**:

| Параметр | Низкая оценка | Высокая оценка |
|---|---:|---:|
| Каналов | 1 600 | 3 200 |
| Sample rate | 100 Гц | 250 Гц |
| Бит на отсчёт | 24 (3 байта) | 32 (4 байта) |
| Поток в секунду | ≈ 0.5 МБ/с | ≈ 3.2 МБ/с |
| В сутки (raw) | ≈ 40 ГБ | ≈ 270 ГБ |
| В год | ≈ 15 ТБ | ≈ 100 ТБ |
| WS-сообщений/сек (broadcast «как есть») | 160 000 | 800 000 |

Текущая реализация (одиночный Express + `Set<WebSocket>` + `pg.Pool` + одна таблица `waveform_data` в PostgreSQL) **не выдержит** такой объём: `setInterval`-цикл и in-process broadcast блокируют event loop, PostgreSQL без партиционирования деградирует на 10⁹ строк/мес, нет очереди приёма от станций.

## 2. Целевая архитектура

```
Станции (80)──MQTT/SeedLink──►  EMQX / ringserver
                                        │
                                        ▼
                                 Kafka  (партиции по station)
                       ┌────────────────┼────────────────┐
                       ▼                ▼                ▼
                Detector (Flink)  Persister      Notifier
                    │              ├─► TimescaleDB (индексы + агрегаты)
                    │              └─► MinIO/S3 (raw MiniSEED)
                    ▼
                Express API (×N) ◄── Redis (cache + pub/sub)
                       │
                       ▼
              Nginx + WSS + sticky sessions ──► Браузеры
```

## 3. Рекомендации по слоям

### A. Приём данных от станций (edge → ingest)

1. **Брокер MQTT/Kafka вместо прямого WebSocket-подключения станций.**
   - **MQTT (EMQX / Mosquitto)** — лёгкий протокол на стороне станции (микроконтроллер, малое потребление). Темы: `seis/{network}/{station}/{sensor}/{component}`.
   - **Apache Kafka** для длинной шины: партиционирование по `station_id`, ретеншн 7–30 дней — даёт буфер при отказе хранилища.
2. **Стандартные сейсмологические протоколы** — `SeedLink` (RingBuffer от *ringserver*) для интеграции с FDSN-сетями; параллельно собственный MQTT-канал для статусов/health.
3. **Локальный концентратор на стороне станции** (микро-PC / Raspberry Pi 4): локальный буфер 24–72 ч, дельта-передача при восстановлении связи, NTP/PTP-синхронизация (≤ 1 мс точность необходима для триангуляции).

### B. Поток данных «hot path»

4. **Stream-процессор** (Kafka Streams / Apache Flink / NATS JetStream consumer):
   - STA/LTA-детектор переносится из `seismicUtils.ts` в потоковую задачу — Express освобождается от тяжёлых вычислений;
   - детектированные события публикуются в топик `events.detected`, на который подписывается уведомитель (Telegram/Email/Slack) и API-уровень.
5. **Триангуляция эпицентра** — отдельный воркер, реагирующий на «window of triggers» в сети станций, пишет результат в `events`.

### C. Хранение волновых данных

6. **TimescaleDB hypertable** поверх существующего PostgreSQL: автоматическое партиционирование `waveform_data` по часу + native-сжатие (10–20× компрессия), continuous aggregates для downsampled видов (1 Гц / 1 мин), retention-политика автоматического удаления сырых данных через N дней.
7. **Объектное хранилище для архива (MinIO / S3)** — сырые сегменты MiniSEED по 1 час хранить как файлы; в PostgreSQL — только индекс (`station_id, start_ts, end_ts, object_key`). Это кратно дешевле и снимает нагрузку с БД.
8. **OLAP-копия** (ClickHouse) для тяжёлой аналитики и каталогов событий за многолетний горизонт.

### D. Приложение (Express)

9. **Stateless-инстансы за reverse-proxy (Nginx / Caddy / Traefik)**, горизонтальное масштабирование 3–N реплик. Сейчас сессии в памяти — переключить на `connect-pg-simple` (или Redis), без этого скейлить нельзя.
10. **Вынести WebSocket-fanout в отдельный сервис**: либо Redis Pub/Sub + sticky sessions, либо `centrifugo` / NATS — текущий `Set<WebSocket>` живёт в одном процессе и не масштабируется.
11. **Connection pooling**: `pgbouncer` (transaction mode) перед PostgreSQL — иначе каждая Node-реплика будет открывать десятки прямых соединений.
12. **Rate-limit и backpressure** на ingest-эндпоинтах (Express middleware `express-rate-limit` или у Nginx).
13. **API-кеш Redis** для часто опрашиваемых ручек (`/api/stations`, `/api/networks`, `/api/system/status`) с TTL 1–5 c — снизит RPS к БД на порядок.
14. **Job-runner** (BullMQ/Redis): тяжёлые задачи — синхронизация USGS/JMA, генерация отчётов МТСМ, расчёт спектров отклика — выносятся из HTTP-цикла. Сейчас USGS sync блокирует поток внутри `POST /api/earthquakes/sync`.

### E. Реал-тайм для UI

15. **Downsample на сервере** перед отправкой во фронтенд: для отображения waveform в реальном времени достаточно 20–40 точек/с на канал; полный 100/250 Гц поток нужен только при разборе события.
16. **Server-Sent Events (SSE) для односторонних обновлений алертов/статусов** вместо WS — проще, не теряется через прокси.

### F. Безопасность и эксплуатация

17. **TLS terminating** на reverse-proxy, `wss://`. mTLS на канале «станция ↔ ingest».
18. **Снять временный bypass auth** перед продакшеном; добавить refresh-токены (или продолжить session-cookie + CSRF).
19. **Журналирование и метрики** — Prometheus + Grafana (Node-метрики, pg_stat, Kafka lag); Loki для логов; Sentry для ошибок фронта/бэка.
20. **Healthcheck-эндпоинты** `/healthz` (live) и `/readyz` (ready, проверка пула БД и брокера) — нужны для Kubernetes/Docker Swarm.
21. **Бэкапы и DR**: WAL-архив PostgreSQL (`pgBackRest`), снапшоты MinIO в холодное хранилище, регулярная проверка восстановления.

### G. Кодовая база (рефакторинг параллельно с инфраструктурой)

22. **`storage.ts` — 3982 строки** в одном файле; разбить по доменам (`storage/stations.ts`, `storage/seismograms.ts`, `storage/calculations.ts` …). Аналогично `routes.ts` (1399 строк) → routers по доменам с `app.use('/api/stations', stationsRouter)`.
23. **`Analysis.tsx` — 1726 строк** на одной странице: вынести каждую вкладку в отдельный модуль `pages/analysis/{Calibration,Fourier,Mtsm,Mke,Response,Resonance,Scenarios}.tsx`.
24. **Перенос тяжёлых численных алгоритмов** (Newmark-β, FFT, амплификация) с фронтенда в backend-воркер: фронтенд получает результат, не нагружает браузер пользователя при обработке многоканальных сейсмограмм.

## 4. Рекомендуемая последовательность внедрения

1. **Этап 1 — рефакторинг кода**: разбить `storage.ts` и `routes.ts` по доменам; вынести вкладки из `Analysis.tsx`.
2. **Этап 2 — БД**: TimescaleDB-расширение, преобразование `waveform_data` в hypertable, continuous aggregates, retention.
3. **Этап 3 — приём от станций**: MQTT-брокер + локальный концентратор + Kafka-шина.
4. **Этап 4 — горизонтальное масштабирование**: Redis-сессии, Redis Pub/Sub fanout WS, pgbouncer, Nginx + N реплик Express.
5. **Этап 5 — наблюдаемость и DR**: Prometheus/Grafana, Loki, бэкапы, healthcheck-эндпоинты.
