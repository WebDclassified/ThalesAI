# API contract

All endpoints are server-side, unauthenticated (local MVP), and return errors as
`{ "error": { "code": string, "message": string } }`.

## Tasks

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/tasks` | Create a task. Body `{ prompt: 12–5000 chars, name?: ≤120 chars, targetRecords?: 1–500 }`. `201 {task}`; name is derived from the prompt when absent. |
| GET | `/api/tasks` | `{tasks}` |
| GET | `/api/tasks/:id` | `{task, runs, dataset}`; 404 if missing. |
| DELETE | `/api/tasks/:id` | Deletes the task and cascade: runs, events, dataset, records, issues, reports. |
| POST | `/api/tasks/:id/plan` | Generate (or regenerate) the plan. 409 `RUN_ACTIVE` while a run is in flight. `{plan, source: 'ai'\|'fallback'}`. |
| POST | `/api/tasks/:id/run` | Start a run. Idempotent: returns the in-flight run with `reused: true`. 409 `NO_PLAN` without a plan. `202 {run}`. |
| GET | `/api/tasks/:id/events?runId=` | Snapshot `{run, events}` for one run; `no-store`. |

## Datasets

Datasets are addressable by their id **or** the owning task id.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/datasets/:id` | `{dataset, records, issues}` |
| GET | `/api/datasets/:id/export?format=csv\|json` | Attachment download. 400 invalid format, 404 missing, 409 while processing, 422 when empty. CSV encoding neutralizes formula injection (`=+-@` prefixes). |

## Review

| Method | Path | Description |
| --- | --- | --- |
| PATCH | `/api/issues/:id` | Body `{resolved: boolean}`. Resolving the last open issue on a record marks the record `valid` and completes its task; reopening returns the record to `review`. `{issue, record}`. |

## Reports, search, reset

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/reports` | Body `{datasetId}`. 409 while processing, 422 when empty. `201 {report}`. |
| GET | `/api/search?q=` | `{tasks, datasets, records}` — up to 5 each, empty arrays under 2 chars. |
| POST | `/api/reset` | Body `{"confirm": true}` required; wipes the workspace. Anything else is a 400. |

## CLI

`pnpm seed` resets the workspace and creates one planned demo task.
