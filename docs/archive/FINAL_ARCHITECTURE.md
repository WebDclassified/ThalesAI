# ThalesAI — Final Architecture

## Runtime
- Next.js 16 App Router
- React 19
- TypeScript
- Native CSS design system
- Zod
- Lucide React

Current Next.js 16.3.8 is an Active LTS release and React 19.3.0 is the current React release checked on 2026-10-02. See `RESEARCH_SOURCES.md`.

## Persistence
The default demo uses an atomic JSON state file under `.data/state.json`.
This intentionally removes database setup from the hackathon demo.

The persistence layer is isolated in `lib/db.ts`, so it can later be replaced by SQLite/Postgres/Drizzle without changing UI contracts.

## Services
- `lib/ai.ts`: provider-agnostic OpenAI-compatible planner
- `lib/workflow.ts`: deterministic workflow executor
- `lib/validation.ts`: normalization, canonical-key generation, deduplication, validation
- `lib/demo.ts`: synthetic records + fallback plan

## API surface
- `POST /api/tasks`
- `GET /api/tasks`
- `POST /api/tasks/:id/plan`
- `POST /api/tasks/:id/run`
- `GET /api/tasks/:id/events?runId=`
- `GET /api/datasets/:id`
- `GET /api/datasets/:id/export?format=csv|json`
- `POST /api/reports`
- `POST /api/seed`

## Source adapter boundary
The current workflow is intentionally deterministic for the default demo. A live source adapter should be introduced behind an interface; do not scatter provider-specific code through the application.

## Reliability posture
The app must degrade safely:
AI provider unavailable → deterministic planner fallback.
Live integrations unavailable → demo adapter.
Report AI unavailable → deterministic report.
Empty workspace → actionable empty state.
Partial workflow error → persisted failed state and visible recovery message.
