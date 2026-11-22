# Farmer Portal — Backend API

Node.js + Express + TypeScript + Mongoose REST API for the Farmer FID Card Maker &
Multi-Service Management Portal.

## Prerequisites

- **Node.js 18+** and npm. **No Docker and no MongoDB install needed** for the quick start.

## Quick start (no Docker, no MongoDB to install)

```bash
npm install
npm run dev          # API on http://localhost:5000
```

On first run the `.env` file is created for you from `.env.example`, which defaults to
`USE_MEMORY_DB=true` (an in-memory MongoDB, nothing to install) and `AUTO_SEED=true`
(creates the admin on startup). First start downloads a small MongoDB binary (needs
internet once, then works offline). **Data is not kept between restarts in this mode.**

Seeded admin login:

```
Email:    admin@farmerportal.local
Password: Admin@12345
```

Health check: `GET http://localhost:5000/api/health`

## Run with a persistent database (optional)

Install MongoDB locally (no Docker required) and edit `.env`:

```
USE_MEMORY_DB=false
MONGODB_URI=mongodb://127.0.0.1:27017/farmer_portal
```

Then seed the first admin once and start:

```bash
npm run seed
npm run dev
```

## Scripts

```bash
npm run dev               # dev server (ts-node-dev, auto-reload)
npm run build             # compile to dist/
npm start                 # run compiled dist/server.js
npm run seed              # create the seed Super Admin (persistent DB)
npm run lint              # ESLint
npm run typecheck         # tsc --noEmit
npm run test:unit         # unit tests (no DB needed)
npm run test:integration  # integration tests (spins up in-memory MongoDB; needs internet first run)
npm test                  # all tests
```

## Configuration (`.env`)

See `.env.example` for all options. Before any shared/public deployment set strong values
for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DATA_ENCRYPTION_KEY`, change
`SEED_ADMIN_PASSWORD`, set `USE_MEMORY_DB=false` with a real `MONGODB_URI`, and set
`CLIENT_ORIGINS` to your frontend URL.

## CORS / frontend

`CLIENT_ORIGINS` defaults to `http://localhost:5173` (the frontend dev server). The frontend
proxies `/api` to this backend in development, so no extra setup is needed locally.

## API overview

Base path `/api`. Modules: `auth`, `farmers` (+ `/:id/history`, `/lookup`), `fid`, `wallet`,
`dashboard`, `crop-applications`, `vehicle-applications`, `trailer-applications`,
`loan-leads`, `documents`, `manual-payments`, `payment-settings`, `users`, `audit-logs`,
`applications`, `reports`. All protected routes enforce JWT auth + role-based access on the
server. See `../docs/STATUS.md` (in the full repo) for the endpoint list and project status.
