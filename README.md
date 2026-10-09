# CivicPilot Phase 1 — Extension + Backend

This starter implements local field spotlighting, Clerk sign-in UI, and privacy-conscious interaction telemetry to an Express/PostgreSQL backend.

## Important integration notes
- This is a starter scaffold, not a verified drop-in replacement for your existing project. Merge files with care if your extension/backend already contain working code.
- The extension uses MV3 + Vite. Build output must include `manifest.json`, `sidepanel.html`, `background.js`, and `content.js`.
- Clerk's extension SDK APIs can change. Install current dependencies and verify the provider/redirect configuration against your Clerk dashboard.
- Do not store secrets in the extension. `VITE_CLERK_PUBLISHABLE_KEY` is public; `CLERK_SECRET_KEY` stays in backend `.env`.
- Telemetry intentionally omits raw field values. The sample omits free-text query content from persistent logs by default to reduce PII risk.
- Content scripts cannot run on restricted browser pages (e.g. `chrome://` pages or the Chrome Web Store).
- The code has not been built or tested in this environment.

## Structure
- `extension/`: React, TypeScript, Vite, Tailwind, Clerk, MV3 content script and service worker.
- `backend/`: Express, Clerk token verification, telemetry endpoint, health endpoint, PostgreSQL schema.

## Setup
1. Copy `extension/.env.example` to `extension/.env` and add the Clerk publishable key and API URL.
2. Copy `backend/.env.example` to `backend/.env`, add your Clerk secret key and PostgreSQL/TimescaleDB URL.
3. Enable Clerk's Native API for the Clerk application used by the extension.
4. Run the SQL in `backend/src/db/schema.sql` against your database.
5. Run `npm install` in both `backend/` and `extension/`.
6. Start backend with `npm run dev`; start extension build with `npm run build`.
7. Load the generated extension `dist/` directory from `chrome://extensions` with Developer mode enabled.

## Endpoints
- `GET /api/health`
- `POST /api/telemetry` (Clerk bearer token required)

## Current scope
Phase 1 focuses on field detection/spotlighting and telemetry. General guidance and GenAI are intentionally not implemented yet. The telemetry route stores event metadata only, not form values or free-text query content.
