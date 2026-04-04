# UCASA APP (Universal Collision Avoidance System Advisory App)

[![Build](https://img.shields.io/github/actions/workflow/status/atozasworks/cas_ai/ci.yml?branch=main&style=for-the-badge)](https://github.com/atozasworks/cas_ai/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](./LICENSE)
[![Version](https://img.shields.io/github/v/release/atozasworks/cas_ai?style=for-the-badge)](https://github.com/atozasworks/cas_ai/releases)

A production-ready, real-time collision avoidance and emergency safety platform built with React, Node.js, Socket.IO, MongoDB, and Redis.

## Project Overview

UCASA APP helps drivers and fleet systems detect and react to potential collision risks in real time. The platform combines deterministic risk scoring with ML-ready decision fusion, live telemetry streaming, and a rich dashboard for alerts, analytics, and AI-assisted guidance.

## Key Features

- Real-time vehicle telemetry using Socket.IO
- Proximity and collision-risk detection engine
- AI-assisted decision layer (OpenAI/Groq/DeepSeek pluggable)
- Emergency alert workflows and safety confirmation flows
- Driver behavior analytics (hard braking, turns, speed patterns)
- Interactive dashboard with map, radar, risk meter, and alerts
- Geo queries with Redis and MongoDB 2dsphere fallback
- Scalable architecture with Redis adapter and stateless API

## Screenshots / Demo

Add your actual screenshots inside `docs/screenshots/` and update the links.

- Dashboard: `docs/screenshots/dashboard.png`
- Live Tracking Map: `docs/screenshots/live-map.png`
- Analytics View: `docs/screenshots/analytics.png`
- Demo Video: `https://your-demo-link.example.com`

## Installation

### Prerequisites

- Node.js 18+
- MongoDB 7+
- Redis (optional but recommended)
- Git

### 1. Clone repository

```bash
git clone https://github.com/atozasworks/cas_ai.git
cd cas_ai
```

### 2. Install dependencies

```bash
cd server
npm install
copy .env.example .env

cd ..\client
npm install
copy .env.example .env
```

### 3. Configure environment

Update `server/.env` with your MongoDB URI, JWT secret, and optional AI provider keys.

## Usage

Run backend and frontend in separate terminals.

### Terminal 1 - Backend

```bash
cd server
npm run dev
```

### Terminal 2 - Frontend

```bash
cd client
npm start
```

App runs at `http://localhost:3000` (frontend) and `http://localhost:5000` (backend).

## Tech Stack

- Frontend: React 18, React Router, Leaflet, Recharts
- Backend: Node.js, Express
- Realtime: Socket.IO, socket.io-client
- Database: MongoDB (Mongoose)
- Cache and Pub/Sub: Redis (ioredis)
- Auth and Validation: JWT, bcryptjs, Joi
- Observability: Morgan, Winston

## Folder Structure

```text
cas_ai/
|- client/
|  |- public/
|  |- src/
|  |  |- components/
|  |  |- context/
|  |  |- hooks/
|  |  |- services/
|  |  `- styles/
|  `- package.json
|- server/
|  |- config/
|  |- controllers/
|  |- middleware/
|  |- models/
|  |- routes/
|  |- services/
|  |- sockets/
|  |- utils/
|  |- server.js
|  `- package.json
|- .gitignore
|- CONTRIBUTING.md
|- LICENSE
`- README.md
```

## Contribution

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening an issue or pull request.

Quick flow:

1. Fork the repo
2. Create a feature branch
3. Make focused changes with clear commits
4. Open a PR with context, screenshots, and linked issue

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
