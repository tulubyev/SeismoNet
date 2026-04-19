# Сеть сейсмических наблюдений — г. Иркутск

## Overview

Специализированная полнофункциональная система сейсмического мониторинга инфраструктурных объектов г. Иркутска. Построена на Express.js, React и PostgreSQL. Обеспечивает онлайн-мониторинг, управление станциями, базу данных грунтов и инфраструктурных объектов, нормативную базу СП/СНиП/ГОСТ и онлайн/офлайн просмотр сейсмограмм.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state and React Context for authentication
- **Styling**: Tailwind CSS with shadcn/ui components
- **Build Tool**: Vite with custom configuration
- **Mobile Support**: Dedicated mobile app interface with responsive design
- **Layout**: `AppLayout` (TopNav fixed + footer fixed) wraps all protected pages
- **Home page**: `HomePage` — portal with 9 large color-coded functional blocks (blue, emerald, teal, orange, violet, rose, amber, indigo, cyan)
- **Navigation**: `/` = Home portal; `/monitoring` = Dashboard; all routes in top nav bar

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session-based auth
- **WebSocket**: Real-time communication for live data streaming
- **API**: RESTful endpoints with JSON responses

### Database Architecture
- **Primary Database**: PostgreSQL (via Neon serverless)
- **ORM**: Drizzle ORM with TypeScript schema
- **Migration**: Drizzle Kit for schema migrations
- **Connection**: Connection pooling with @neondatabase/serverless

## Key Components

### Developer (Застройщик) Management
- Carded reestr of building developers with full profile: legal form, ИНН/ОГРН, addresses, contacts, licenses (JSON), introduced and planned objects (JSON), connection status to the seismic monitoring program.
- CRUD via `/api/developers` with Zod validation; page at `/developers` (Sidebar → Объекты).
- Seeded 10 major Irkutsk developers (ГК «Новый город», Грандстрой, ПарапетСтрой, ДомСтрой, ГорСтрой, Родные берега, Профит, СЗ «Регион Сибири», Альфа, Монолитстрой-Иркутск).

### User Management
- Role-based access control (Administrator, User, Viewer)
- Session-based authentication with secure password hashing
- User profile management with organization details
- Protected routes based on user roles

### Seismic Data Processing
- Real-time station monitoring with WebSocket connections
- Event detection algorithms (STA/LTA mentioned in specifications)
- Epicenter calculation using triangulation methods
- Waveform data visualization with D3.js

### Station Management
- Comprehensive station registry with geographic coordinates
- Real-time status monitoring (online/degraded/offline)
- Battery level and power consumption tracking
- Storage capacity monitoring
- Data rate and quality metrics

### Event Management
- Seismic event detection and cataloging
- Magnitude, depth, and location calculations
- Event history with filtering and search capabilities
- Integration with external earthquake APIs (USGS, JMA)

### Data Visualization
- Interactive maps using Leaflet for station and event visualization
  - Resizable map container (CSS `resize:both` + ResizeObserver → Leaflet `invalidateSize`)
  - Category-based layer toggles (driven by `object_categories` table)
- Real-time waveform charts with Chart.js
- Dashboard widgets for system health monitoring
- Mobile-optimized interface for field operations
- **Seismo Live (`/seismo-live`)** — online concentrator dashboard:
  - WebSocket-driven aggregate of all incoming station streams
  - Per-channel mini live waveforms (canvas, ring buffer 1024 samples)
  - Throughput counters (sps, packets), pipeline event log
  - Pause/resume + log clear controls

### Soil Profiles (per monitoring object)
- Soil profile management is embedded inside the "Объекты мониторинга" (infrastructure
  objects) detail panel as a "Грунты" tab — there is no top-level Soils page anymore.
- Each infrastructure object can have multiple boreholes / survey points, each with
  its own (positionX, positionY) within the foundation footprint, layered lithology,
  category per SP 14.13330.2018, Vs30, groundwater depth, dominant frequency, and
  amplification factor.
- Component: `client/src/components/infrastructure/SoilProfilesTab.tsx`.

### External Integrations
- USGS Earthquake API for global seismic data
- Japan Meteorological Agency (JMA) API
- Telegram Bot API for alert notifications
- Unisender for email notifications
- Slack Web API for team communications

## Data Flow

### Real-time Data Pipeline
1. Seismic stations send data via standard protocols (SeedLink, FDSN-WS)
2. Server processes incoming data through event detection algorithms
3. Detected events trigger database storage and WebSocket broadcasts
4. Frontend receives real-time updates via WebSocket connections
5. Dashboard components update automatically with new data

### Authentication Flow
1. User submits login credentials
2. Passport.js validates against database using scrypt password hashing
3. Session is created and stored (PostgreSQL in production, memory in development)
4. Protected routes verify session and role permissions
5. User context is maintained across the application

### Event Processing Flow
1. Raw seismic data is analyzed for P-wave and S-wave arrivals
2. Multiple station readings are triangulated to determine epicenter
3. Magnitude and depth are calculated using velocity models
4. Event is stored in database with metadata
5. Notifications are sent via configured channels (Telegram, Email, Slack)

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: TypeScript ORM for database operations
- **express**: Web server framework
- **passport**: Authentication middleware
- **ws**: WebSocket server implementation

### Frontend Dependencies
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Accessible UI components
- **leaflet**: Interactive maps
- **chart.js**: Data visualization
- **d3**: Advanced data visualization
- **wouter**: Lightweight routing

### External APIs
- **USGS Earthquake API**: Global seismic event data
- **JMA API**: Japan-specific earthquake data
- **Telegram Bot API**: Alert notifications
- **Unisender API**: Email services
- **Slack Web API**: Team notifications

## Deployment Strategy

### Development Environment
- Vite dev server for hot module replacement
- Node.js server with tsx for TypeScript execution
- Environment variables for API keys and database connection
- Local development with memory-based sessions

### Production Build
- Vite builds optimized frontend bundle
- esbuild compiles server code to ESM format
- Static assets served from dist/public
- Database migrations applied via Drizzle Kit

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secure session encryption key
- `TELEGRAM_BOT_TOKEN`: Bot token for notifications
- `UNISENDER_API_KEY`: Email service API key
- `SLACK_BOT_TOKEN`: Slack integration token

### Scalability Considerations
- WebSocket connections managed with connection pooling
- Database queries optimized with proper indexing
- Real-time data processing designed for high throughput
- Mobile-first responsive design for field operations
- Modular architecture allowing horizontal scaling

The application is designed to handle distributed seismic networks with multiple stations, real-time data processing, and comprehensive monitoring capabilities suitable for professional seismic monitoring operations.