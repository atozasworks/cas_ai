# CAS — AI-Enhanced Collision Avoidance System

A production-ready, real-time collision avoidance and emergency safety system built with the MERN stack, featuring AI-powered predictive risk analysis, ML-ready architecture, and a rich interactive dashboard.

---

## Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                         │
│  Dashboard │ Leaflet Map │ Risk Meter │ Radar │ AI Assistant  │
│  Emergency Overlay │ Analytics │ Settings │ Vehicle Selector  │
├───────────────────────────────────────────────────────────────┤
│                     Socket.IO (WebSocket)                     │
├───────────────────────────────────────────────────────────────┤
│                     SERVER (Express.js)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐     │
│  │ Risk Engine  │  │ ML Predict   │  │ AI Decision      │     │
│  │ (Layer 1)    │→ │ Service      │→ │ Engine (Fusion)  │     │
│  │ Deterministic│  │ (Layer 2)    │  │                  │     │
│  └─────────────┘  └──────────────┘  └──────────────────┘     │
│  ┌──────────┐  ┌───────────┐  ┌──────────────────────────┐   │
│  │ Location │  │ Behavior  │  │ AI Conversational        │   │
│  │ Service  │  │ Analytics │  │ Assistant                │   │
│  └──────────┘  └───────────┘  └──────────────────────────┘   │
├──────────────────┬────────────────────────────────────────────┤
│     MongoDB      │              Redis Cache                   │
│  (GeoJSON +      │  (Live locations, Geo queries,             │
│   2dsphere idx)  │   Socket.IO adapter)                       │
└──────────────────┴────────────────────────────────────────────┘
```

---

## Algorithm Math Reference

### 1. Haversine Distance
Calculates great-circle distance between two GPS coordinates:
```
a = sin²(ΔLat/2) + cos(Lat₁) · cos(Lat₂) · sin²(ΔLon/2)
distance = 2R · atan2(√a, √(1−a))     where R = 6,371,000 m
```

### 2. Bearing Calculation
Direction from vehicle A to vehicle B (0–360°):
```
y = sin(ΔLon) · cos(Lat₂)
x = cos(Lat₁)·sin(Lat₂) − sin(Lat₁)·cos(Lat₂)·cos(ΔLon)
bearing = atan2(y, x)  →  normalized to [0, 360)
```

### 3. Relative Direction Detection
Maps bearing difference to quadrants:
| Angle Range        | Direction |
|--------------------|-----------|
| 0° ± 45°          | Front     |
| 90° ± 45°         | Right     |
| 180° ± 45°        | Back      |
| 270° ± 45°        | Left      |

### 4. Relative Speed (Vector)
```
VₐX = Sₐ · sin(Hₐ),    VₐY = Sₐ · cos(Hₐ)
VᵦX = Sᵦ · sin(Hᵦ),    VᵦY = Sᵦ · cos(Hᵦ)
RelativeSpeed = √((VₐX − VᵦX)² + (VₐY − VᵦY)²)
```

### 5. Time-To-Collision (TTC)
```
closingSpeed = RelativeSpeed · cos(angleDelta)
TTC = distance / closingSpeed    (only if closing, else ∞)
```

### 6. Composite Risk Score
```
RiskScore = w₁·ProximityFactor + w₂·RelSpeedFactor + w₃·DirectionFactor + w₄·AccelFactor

Default weights: w₁=0.35, w₂=0.30, w₃=0.20, w₄=0.15
```
ProximityFactor uses exponential curve: `((maxDist − dist) / range)^1.5 × 100`

### 7. AI Decision Fusion
```
FinalRisk = (0.6 × RiskScore/100) + (0.4 × ML_Probability)  →  scaled to 0–100
```

### Risk Levels
| Score Range | Level   |
|-------------|---------|
| 0–30        | Low     |
| 31–60       | Medium  |
| 61–100      | High    |

---

## Setup Instructions (Windows 11)

### Prerequisites
- **Node.js** ≥ 18 (https://nodejs.org)
- **MongoDB Community** ≥ 7 + MongoDB Compass (https://www.mongodb.com/try/download/community)
- **Redis** (via WSL2 or Memurai for Windows): Optional but recommended
- **Git**

### Step 1: Clone & Install

```bash
cd c:\0001work\cas28022026

# Install backend dependencies
cd server
copy .env.example .env
npm install

# Install frontend dependencies
cd ..\client
copy .env.example .env
npm install
```

### Step 2: Configure Environment

Edit `server/.env`:
- Ensure `MONGODB_URI` points to your local MongoDB (default: `mongodb://127.0.0.1:27017/cas_db`)
- Set `JWT_SECRET` to a strong random string
- (Optional) Add AI API keys for `GROQ_API_KEY`, `OPENAI_API_KEY`, or `DEEPSEEK_API_KEY`
- (Optional) Configure Redis if running

### Step 3: Start MongoDB
Ensure MongoDB is running. With default install on Windows:
```bash
net start MongoDB
# Or start mongod manually
```
Open MongoDB Compass → connect to `mongodb://127.0.0.1:27017` → verify connection.

### Step 4: Start Redis (Optional)
If using WSL2:
```bash
wsl -d Ubuntu -e redis-server --daemonize yes
```
If Redis is not available, the system will fall back to MongoDB for geo queries.

### Step 5: Run the System

Terminal 1 — Backend:
```bash
cd server
npm run dev
```

Terminal 2 — Frontend:
```bash
cd client
npm start
```

The app will be available at **http://localhost:3000**.

---

## Project Structure

```
cas28022026/
├── server/
│   ├── config/
│   │   ├── index.js          # Central configuration
│   │   ├── database.js       # MongoDB connection
│   │   └── redis.js          # Redis connection
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── vehicleController.js
│   │   ├── analyticsController.js
│   │   └── aiController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT authentication
│   │   ├── errorHandler.js    # Global error handling
│   │   ├── logger.js          # Winston logger
│   │   └── validate.js        # Joi validation
│   ├── models/
│   │   ├── User.js
│   │   ├── Vehicle.js
│   │   ├── LiveLocation.js    # TTL-indexed, 2dsphere
│   │   ├── TripHistory.js
│   │   ├── RiskEvent.js       # TTL 30 days
│   │   ├── Incident.js
│   │   └── DriverScore.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── authRoutes.js
│   │   ├── vehicleRoutes.js
│   │   ├── analyticsRoutes.js
│   │   └── aiRoutes.js
│   ├── services/
│   │   ├── aiAssistantService.js      # Modular AI chat
│   │   ├── aiDecisionService.js       # Fusion engine
│   │   ├── behaviorAnalyticsService.js
│   │   ├── locationService.js         # Redis + Mongo geo
│   │   └── mlPredictionService.js     # ML Layer 2
│   ├── sockets/
│   │   └── index.js           # Socket.IO + Redis adapter
│   ├── utils/
│   │   └── riskEngine.js      # Layer 1 deterministic
│   ├── server.js              # Entry point
│   ├── package.json
│   └── .env.example
├── client/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Analytics/
│   │   │   │   └── AnalyticsPage.jsx
│   │   │   ├── Common/
│   │   │   │   ├── AuthPage.jsx
│   │   │   │   └── Navbar.jsx
│   │   │   ├── Dashboard/
│   │   │   │   ├── AIAssistant.jsx
│   │   │   │   ├── AlertPanel.jsx
│   │   │   │   ├── DashboardPage.jsx
│   │   │   │   ├── EscapeArrow.jsx
│   │   │   │   ├── ProximityRadar.jsx
│   │   │   │   ├── RiskMeter.jsx
│   │   │   │   ├── SettingsPage.jsx
│   │   │   │   └── VehicleSelector.jsx
│   │   │   ├── Emergency/
│   │   │   │   └── EmergencyOverlay.jsx
│   │   │   └── Map/
│   │   │       └── TrackingMap.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.js
│   │   │   └── SocketContext.js
│   │   ├── hooks/
│   │   │   └── useTheme.js
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── socket.js
│   │   ├── styles/
│   │   │   └── global.css
│   │   ├── utils/
│   │   │   └── helpers.js
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── .env.example
└── README.md
```

---

## API Endpoints

| Method | Endpoint                          | Auth | Description               |
|--------|-----------------------------------|------|---------------------------|
| POST   | /api/v1/auth/register             | No   | Register user             |
| POST   | /api/v1/auth/login                | No   | Login                     |
| GET    | /api/v1/auth/me                   | Yes  | Current user profile      |
| PATCH  | /api/v1/auth/preferences          | Yes  | Update alert prefs        |
| POST   | /api/v1/vehicles                  | Yes  | Add vehicle               |
| GET    | /api/v1/vehicles                  | Yes  | List user vehicles        |
| GET    | /api/v1/vehicles/nearby           | Yes  | GeoJSON nearby query      |
| GET    | /api/v1/analytics/dashboard       | Yes  | Dashboard summary         |
| GET    | /api/v1/analytics/driver-score    | Yes  | Detailed driver score     |
| GET    | /api/v1/analytics/risk-events     | Yes  | Paginated risk events     |
| GET    | /api/v1/analytics/trips           | Yes  | Trip history              |
| POST   | /api/v1/ai/chat                   | Yes  | AI assistant chat         |
| GET    | /api/v1/health                    | No   | Server health check       |

---

## Socket.IO Events

| Event (Client → Server)   | Description                    |
|---------------------------|--------------------------------|
| `join:vehicle`            | Join vehicle tracking room     |
| `location:update`         | Send GPS telemetry             |
| `emergency:iam-safe`      | Confirm safe after crash alert |
| `emergency:report`        | Report emergency               |

| Event (Server → Client)   | Description                    |
|----------------------------|--------------------------------|
| `risk:update`              | Risk assessment + action       |
| `risk:clear`               | No nearby threats              |
| `emergency:crash-detected` | Crash detection alert          |
| `emergency:resolved`       | Emergency resolved             |
| `alert:behavior`           | Hard brake/turn/speed alert    |
| `alert:near-miss`          | Near-miss warning              |
| `nearby:update`            | Nearby vehicle position        |

---

## Scalability Design

1. **Horizontal scaling**: Stateless Express servers behind a load balancer
2. **Sticky sessions**: Required for Socket.IO WebSocket upgrade
3. **Redis adapter**: Socket.IO events broadcast across all instances
4. **Redis geo cache**: O(log N) proximity queries via `GEORADIUS`
5. **MongoDB 2dsphere**: Fallback geo queries with indexed performance
6. **TTL indexes**: Auto-expiring LiveLocation (5 min) and RiskEvent (30 days)
7. **Connection pooling**: MongoDB pool size 50, min 10

---

## Future ML Training Path

1. The `mlPredictionService.js` exports a `createTrainingSample()` function — call it on every risk event with the actual outcome (collision or no collision) to build a labeled dataset.
2. Export samples as CSV/JSON for offline training.
3. Train a binary classifier (logistic regression, random forest, or neural net) using the 9-feature vector.
4. Convert the trained model to TensorFlow.js format (`tfjs_graph_model`).
5. Load via `ModelInterface.loadModel(path)` — the service will automatically switch from mock heuristics to real inference.
6. For edge deployment, the same architecture supports ONNX Runtime or TensorFlow Lite via the model interface.

---

## Tech Stack

| Layer      | Technology                    |
|------------|-------------------------------|
| Frontend   | React 18, Leaflet.js, Recharts|
| Backend    | Node.js, Express.js           |
| Database   | MongoDB (GeoJSON, 2dsphere)   |
| Cache      | Redis (ioredis)               |
| Realtime   | Socket.IO + Redis adapter     |
| AI         | OpenAI / Groq / DeepSeek      |
| Auth       | JWT + bcrypt                  |
| Validation | Joi                           |
| Logging    | Winston                       |

---

*Built for global-scale deployment. No TypeScript — JavaScript only.*
