# Campus Shuttle Tracker

Real-time campus shuttle tracking system — MVP implementation based on the product requirements document.

## Architecture

```
Driver App (React PWA)  ──GPS──►  Backend API (Node.js + Socket.IO)
                                         │
User App (React + Leaflet)  ◄──WebSocket──┘
                                         │
                                    SQLite DB
```

## Features (MVP)

### Driver App (`driver-app/`)
- Secure driver login (JWT)
- Select assigned shuttle
- Start / End shift (trip management)
- Continuous GPS tracking (3–5s while moving, 10s when stationary)
- Background-friendly location updates via Geolocation API

### User App (`user-app/`)
- Student login + Guest mode
- Live map with OpenStreetMap
- Nearby shuttle discovery (configurable radius)
- Real-time shuttle movement via WebSockets
- ETA and distance calculation
- Route and stop display
- Search routes, buildings, and stops
- Arrival notifications (in-app)

### Backend (`backend/`)
- REST API (auth, trips, location, nearby shuttles, ETA, search)
- WebSocket broadcast for live updates
- SQLite database (PostgreSQL-ready schema design)
- In-memory location cache (Redis substitute for MVP)
- JWT authentication

## Prerequisites

- **Node.js 18+** and npm
- Optional: Docker (for PostgreSQL + Redis in production)

## Quick Start

```bash
# 1. Install dependencies
cd campus-shuttle-tracker
npm install

# 2. Set up environment
copy backend\.env.example backend\.env

# 3. Initialize and seed database
npm run db:setup
npm run db:seed

# 4. Start all services
npm run dev
```

| Service    | URL                        |
|------------|----------------------------|
| Backend API | http://localhost:3001     |
| User App   | http://localhost:5173      |
| Driver App | http://localhost:5174      |

## Demo Credentials

| Role    | Email               | Password     |
|---------|---------------------|--------------|
| Student | student@campus.edu  | password123  |
| Driver  | driver1@campus.edu  | password123  |
| Admin   | admin@campus.edu    | password123  |

## Testing the Full Flow

1. Open **Driver App** → login as `driver1@campus.edu`
2. Select shuttle **SH-01** → tap **Start Shift**
3. Allow location access (use browser dev tools to simulate GPS if on desktop)
4. Open **User App** → login or continue as Guest
5. See the shuttle appear on the map in real time with ETA

## API Endpoints

### Auth
- `POST /api/auth/login` — Login
- `POST /api/auth/guest` — Guest access

### Driver
- `POST /api/driver/trip/start` — Start shift
- `POST /api/driver/trip/end` — End shift
- `POST /api/location/update` — Send GPS update
- `GET /api/driver/shuttles` — List assigned shuttles
- `GET /api/driver/trip/active` — Get active trip

### User
- `GET /api/nearby-shuttles?lat=&lng=&radius=` — Nearby shuttles
- `GET /api/shuttle/:id` — Shuttle details
- `GET /api/routes` — All routes with stops
- `GET /api/eta?shuttleId=&lat=&lng=` — ETA calculation
- `GET /api/search?q=` — Search routes and stops

### WebSocket Events
- `subscribe:nearby` — Subscribe to nearby shuttle updates
- `shuttles:snapshot` — Initial shuttle list
- `shuttle:update` — Real-time location broadcast

## Project Structure

```
campus-shuttle-tracker/
├── backend/           # Node.js API + WebSocket server
│   └── src/
│       ├── routes/    # REST endpoints
│       ├── services/  # ETA, location cache
│       └── db/        # Schema, seed data
├── user-app/          # Student-facing React app
├── driver-app/        # Driver-facing React PWA
├── docker-compose.yml # PostgreSQL + Redis (optional)
└── package.json       # Monorepo workspace root
```

## Production Notes

- Change `JWT_SECRET` in `backend/.env`
- Replace SQLite with PostgreSQL (schema included)
- Replace in-memory cache with Redis (`docker-compose up`)
- Deploy backend behind HTTPS with a reverse proxy
- Build mobile apps with React Native / Flutter using the same API
- Enable push notifications (Phase 2)

## License

MIT
