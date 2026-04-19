# Архитектура программного обеспечения

Документ описывает текущее состояние ПО «Сеть сейсмических наблюдений за объектами гражданской и промышленной инфраструктуры г. Иркутска» — компоненты, их функции и реализующие методы.

## 1. Общая топология

```
┌──────────────────────────────────────────────────────────────────────┐
│  Браузер (React 18 + Vite + Wouter + TanStack Query + shadcn/UI)    │
│   ── HTTP REST  ──────────►  Express                                 │
│   ── WebSocket /ws  ──────►  ws (single instance, in-process)        │
└──────────────────────────────────────────────────────────────────────┘
                  ▲
                  │
┌──────────────────────────────────────────────────────────────────────┐
│  Node.js / Express (server/index.ts, port 5000)                      │
│   ├── server/auth.ts          Passport-local + express-session       │
│   ├── server/routes.ts        72 REST + WS broadcast (1399 LOC)      │
│   ├── server/storage.ts       IStorage / DatabaseStorage (3982 LOC)  │
│   ├── server/seismicUtils.ts  STA/LTA, триангуляция, магнитуда       │
│   └── server/services/        USGS, JMA, Telegram, Unisender         │
└──────────────────────────────────────────────────────────────────────┘
                  ▲
                  │  drizzle-orm + pg.Pool (node-postgres)
                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│  PostgreSQL  (VPS_DATABASE_URL → fallback DATABASE_URL)              │
│  23 таблицы: users, regions, stations, events, waveform_data,        │
│  alerts, maintenance_records, infrastructure_objects, developers,    │
│  object_categories, soil_profiles, soil_layers, sensor_installations,│
│  building_norms, seismogram_records, calibration_sessions/afc,       │
│  seismic_calculations, system_status, research_networks ...          │
└──────────────────────────────────────────────────────────────────────┘
```

## 2. Frontend (`client/src/`)

| Блок | Файл | Назначение / методы реализации |
|---|---|---|
| **Layout / навигация** | `components/layout/AppLayout.tsx` | Фикс. шапка `TopNav` + футер; 7 пунктов меню (Обзор · Объекты · Датчики · Сигналы · Расчёты · Грунты · Настройки); индикатор WS, бейдж непрочитанных alerts. |
| **Маршрутизация** | `App.tsx` + `wouter` | SPA-роутинг, `ProtectedRoute` обёртка с проверкой роли. |
| **Состояние сервера** | TanStack Query v5 + `lib/queryClient.ts` | Дефолтный fetcher; ключи cache совпадают с URL `/api/...`; инвалидация после мутаций. |
| **Auth (frontend)** | `hooks/use-auth.tsx` + `pages/auth-page.tsx` | React Context + login/register/logout мутации; временный bypass для разработки. |
| **WS-канал** | `hooks/useSeismicData.ts` | Подключение к `/ws`, обработка `STATION_STATUS / EVENT_NOTIFICATION / NETWORK_STATUS / DATA_EXCHANGE`. |
| **Обзор** | `pages/HomePage.tsx`, `pages/Dashboard.tsx` | Карточки KPI, виджеты системного здоровья. |
| **Объекты инфраструктуры** | `pages/InfrastructureObjects.tsx` (926 LOC) | CRUD объектов, привязка категорий/застройщика/норм, карта Leaflet. |
| **Датчики / Станции** | `pages/Stations.tsx → AddStation.tsx` | Регистр станций, монтаж датчиков, статус (online/degraded/offline). |
| **Сигналы** | `pages/Seismograms.tsx`, `SeismoLive.tsx`, `Archive.tsx` | Каталог сейсмограмм, real-time waveform (Chart.js/D3), архив с фильтрами. |
| **Расчёты** | `pages/Analysis.tsx` (1726 LOC) | 7 вкладок: Калибровка АЧХ → Фурье/H-V → МТСМ → МКЭ-усиление → Спектр отклика → Резонанс → Сценарии. Численные методы: Newmark-β для SDOF, амплификация по 1-D переносу волны через слои, FFT по реальной/тестовой сейсмограмме, каталог сценариев Байкала (Mw 5–7, СП 14.13330). |
| **БД грунтов** | `pages/SoilDatabase.tsx` (1015 LOC) | Профили + слои (Vs, Vp, ρ, толщина), геопривязка, расчёт Vs30. |
| **Нормы** | `pages/BuildingNorms.tsx` | Справочник СП/СНиП/ГОСТ. |
| **Карта событий** | `pages/EventMap.tsx` + Leaflet | Эпицентры USGS/JMA, кластеризация. |
| **История событий** | `pages/EventHistory.tsx` | Фильтры по магнитуде/глубине/региону. |
| **Застройщики** | `pages/Developers.tsx` (772 LOC) | Управление застройщиками + связанные объекты. |
| **Настройки** | `pages/Settings.tsx` | Параметры пользователя/приложения. |

## 3. Backend (`server/`)

| Блок | Файл | Назначение / методы |
|---|---|---|
| **Bootstrap** | `index.ts` | Express + JSON middleware, логгер запросов с подавлением «шумных» 304 для polling-маршрутов, Vite-dev mid-ware, единый порт 5000. |
| **Auth** | `auth.ts` | Passport local strategy, `scrypt` для паролей, express-session (memory/PG), `requireRole(['administrator','user','viewer'])` middleware. |
| **REST API** | `routes.ts` (72 эндпоинта) | См. таблицу разделов ниже. |
| **WebSocket** | `routes.ts:58–145, 1218+` | `WebSocketServer({ path: '/ws' })`, `Set<WebSocket>` клиентов, `broadcastMessage()`, `setInterval` для симуляции данных. |
| **Сейсмо-утилиты** | `seismicUtils.ts` | STA/LTA-детектор, расчёт расстояния по разности времён P/S, триангуляция эпицентра, формулы магнитуды. |
| **Внешние сервисы** | `services/earthquakeApi.ts` (USGS), `jmaEarthquakeApi.ts` (JMA), `telegram.ts`, `unisender.ts` | Polling/sync землетрясений, рассылка alert'ов. |
| **Storage слой** | `storage.ts` | `IStorage` интерфейс, `MemStorage` (тесты/dev), `DatabaseStorage` (drizzle-pg) — единая абстракция CRUD. |
| **DB-клиент** | `db.ts` | `pg.Pool` + `drizzle()`, регистрация всех 23 таблиц схемы. |

### REST API — группы эндпоинтов
- **Станции / обслуживание** — `GET/PATCH /api/stations(/:id)`, `/maintenance`, `/battery`, `/storage`
- **События** — `/api/events/recent`, `/api/events/:id`
- **Регионы** — `/api/regions`, `/api/regions/:id/stations`
- **Землетрясения (внешние)** — `/api/earthquakes`, `/sync` (USGS), `/sync/jma`
- **Сети / системный статус / алерты** — `/api/networks`, `/api/system/status`, `/api/alerts`
- **Объекты инфраструктуры + категории** — `/api/infrastructure-objects`, `/api/object-categories`
- **Застройщики** — `/api/developers`
- **Грунты** — `/api/soil-profiles`, `/api/soil-profiles/nearest`, `/api/soil-layers`
- **Датчики** — `/api/sensor-installations`
- **Нормы** — `/api/building-norms`
- **Сейсмограммы** — `/api/seismograms`, `/use-for-modeling`, `/status`
- **Калибровка АЧХ** — `/api/calibration-sessions`, `/api/calibration-afc`
- **Расчёты конструкций** — `/api/calculations` (МТСМ, response spectrum, резонанс)
- **Уведомления** — `/api/notifications/email/event`, `/api/notifications/telegram/event`

## 4. Слой данных (`shared/schema.ts`)

23 таблицы (drizzle-orm `pgTable`), для каждой определены `insertSchema` (drizzle-zod) и типы `Insert*`/`Select*`. Ключевые группы:

- **Идентичность/безопасность** — `users`
- **Геопривязка** — `regions`, `infrastructure_objects`, `soil_profiles`
- **Сеть** — `stations`, `sensor_installations`, `research_networks`, `system_status`
- **Сигналы** — `waveform_data`, `seismogram_records`, `events`
- **Калибровка/расчёты** — `calibration_sessions`, `calibration_afc`, `seismic_calculations`
- **Геология** — `soil_profiles`, `soil_layers`
- **Нормативы** — `building_norms`, `object_categories`
- **Эксплуатация** — `maintenance_records`, `alerts`
- **Аналитика** — `historical_analysis`, `comparison_studies`

Миграции выполняются командой `npm run db:push` (политика проекта: SQL-файлы миграций не пишутся вручную).
