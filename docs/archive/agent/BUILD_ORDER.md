# Build Order

## Phase 1 — Foundation
- Create Next.js App Router project.
- Add Tailwind 4.
- Add shared UI primitives.
- Add local SVG branding/icon set.
- Add route shell and responsive layout.

## Phase 2 — Data Layer
- Add Drizzle schema for SQLite.
- Add migrations.
- Add seed/demo data.
- Add repository layer with typed access.

## Phase 3 — Planner
- Prompt form.
- Requirement parser.
- ResearchPlan Zod schema.
- Deterministic fallback plan.
- Optional Ollama structured output.

## Phase 4 — Execution
- Workflow run state machine.
- Source adapter registry.
- Mock adapter.
- Optional public-source adapters.
- Persist steps + progress.
- SSE progress stream.

## Phase 5 — Quality
- normalization
- canonical keys
- duplicate detection
- validation issues
- review queue

## Phase 6 — Intelligence
- dataset table
- search/filter/pagination
- record detail
- evidence panel
- analytics
- report
- export

## Phase 7 — Hardening
- error states
- empty states
- cancellation
- restart/resume rules
- idempotency
- retry/backoff
- rate limits
- logging
- security checks
- automated tests
