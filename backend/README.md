# CivicPilot Backend — Phase 1

## Stack
Express + TypeScript + PostgreSQL/TimescaleDB + Clerk session-token verification.

## Setup
```bash
npm install
cp .env.example .env
# Configure DATABASE_URL and CLERK_SECRET_KEY
npm run dev
```

Apply `src/db/schema.sql` to the configured PostgreSQL/TimescaleDB database.

## Endpoints
- `GET /api/health`
- `POST /api/telemetry` — requires `Authorization: Bearer <Clerk session token>`
- `POST /api/copilot` — placeholder; Phase 1 field location is local in the extension

## Privacy
Telemetry schema rejects free-text query content and field values. It stores only interaction metadata and a portal hostname. Never log secrets or form values. The database identity is derived from the verified Clerk token, not a client-provided user ID.

## TimescaleDB
The schema includes an optional commented `create_hypertable` statement. Enable it only if TimescaleDB is installed on the database.
