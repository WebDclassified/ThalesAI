# Architecture

ThalesAI is a local-first data intelligence platform. One Next.js process serves
the UI and the API; state lives in a JSON file. No paid infrastructure, no
external database.

## Stack

- Next.js 16 (App Router) + React 19, TypeScript strict
- Zod for all input/output validation
- lucide-react icons; hand-rolled CSS design system (`design/tokens.css`)
- Persistence: single JSON file (`DATA_DIR/state.json`, default `.data/`)
- Tests: `node:test`, no test framework dependency

## Layers

```
app/            pages (server components) + API routes
components/     UI primitives (server-safe) + client islands
lib/
  types.ts      entity model + source-adapter boundary
  db.ts         atomic JSON store: in-process mutex + cross-process lockfile
                + one-generation backup on every write
  recovery.ts   settles runs orphaned by a server restart (once per process)
  ai.ts         OpenAI-compatible planner: strict JSON schema, Zod-validated,
                deterministic fallback
  workflow.ts   deterministic run executor: collect -> dedupe -> validate
  validation.ts normalization, canonical keys, validation rules, dedupe rules
  review.ts     human review resolution (pure, unit-tested)
  analytics.ts  dataset summaries (pure, unit-tested)
  report.ts     deterministic report generation
  export.ts     CSV/JSON encoding with formula-injection defense
  adapters/     source-adapter registry; ships only the synthetic demo adapter
```

## Data flow

1. `POST /api/tasks` — a prompt becomes a task (name derived if absent).
2. The task page auto-plans: `POST /api/tasks/:id/plan`. The planner calls the
   configured OpenAI-compatible provider (strict JSON schema, fresh timeout per
   attempt, retry without schema on rejection) and validates the response with
   Zod. Any failure falls back to a deterministic plan; `planSource` records
   which path produced it.
3. `POST /api/tasks/:id/run` — idempotent (a second POST returns the in-flight
   run). Creates a run + processing dataset inside one locked state update,
   then executes in the background.
4. `lib/workflow.ts` — the adapter collects candidates; records are deduplicated
   (nothing merges silently: low-confidence and fuzzy matches become review
   candidates), validated, persisted incrementally, and the dataset is marked
   ready. Progress and events are persisted at every milestone.
5. The run page polls `GET /api/tasks/:id/events` every 800 ms and stops itself
   at a terminal state.
6. Datasets expose records (filterable), analytics, evidence sources, a
   deterministic report, and CSV/JSON export.

## Crash safety

- Writes are atomic (tmp file + rename) with a `.bak` written after each update.
- A corrupt primary file falls back to the backup; nothing is silently lost.
- `reconcileOnBoot()` marks stranded runs `failed` with an explanatory event,
  keeps datasets that already hold records (`ready`), fails empty ones, and
  settles their tasks. It runs before the first render or events poll.

## Collection sources

`lib/adapters/index.ts` selects the source per requirement:

| Requirement | Source | Data |
| --- | --- | --- |
| Job openings | Arbeitnow + RemoteOK (free, keyless) | Real postings, merged |
| Sponsor opportunities | GitHub repo search | Real high-star projects |
| Market data | CoinGecko | Real prices and market caps |
| Anything else / offline | `demo-adapter.ts` | Clearly-labeled synthetic data |

A live-source failure (network, rate limit, empty feed) never blocks a run: the
workflow logs a `source.fallback` event and finishes on the synthetic adapter.
`DEMO_MODE=true` forces the synthetic adapter for every task.

## Extending collection

The workflow only talks to `SourceAdapter` (`lib/types.ts`). A new source
implements `collect()` and is registered in `lib/adapters/index.ts`; selection
lives in `resolveAdapterForPlan`. No user-supplied URLs are ever fetched, so
the live adapters have no SSRF surface.
