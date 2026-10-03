# ThalesAI — AI-Powered Data Intelligence Platform

Built by **Team Thales**. A working end-to-end MVP for the hackathon's
"AI-Powered Data Intelligence Platform" problem statement.

Natural-language request → research plan → collection → validation +
deduplication → review → dataset → analytics → report → export — fully
observable, source-backed, and runnable offline at zero cost.

## Quick start

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 and create a task. Demo mode is on by default: data
persists to `.data/state.json`, collection uses a deterministic synthetic
adapter, and planning falls back locally when no AI provider is configured.

Live collection is on by default (`DEMO_MODE=false`): job, sponsor and
market-data requirements are filled from real public APIs with the source URL
on every record. Set `DEMO_MODE=true` for the fully offline synthetic demo.

The default configuration plans with a **local Ollama model** (qwen2.5:3b —
free, unlimited, offline; `ollama serve` + `ollama pull qwen2.5:3b-instruct`).
Any OpenAI-compatible provider works — set the three `AI_*` variables:

Optional — plan with your own OpenAI-compatible provider:

```env
AI_BASE_URL=https://your-provider.example/v1
AI_API_KEY=YOUR_KEY
AI_MODEL=YOUR_MODEL
```

Keys are server-side only. If the provider fails, the deterministic planner
takes over and the UI labels the plan's provenance.

## What the product does

- **Plan** — an AI (or deterministic) research plan with entity, geography/time
  filter, target count, fields, source roles, steps and validation rules. The
  planner designs a plan for *any* requirement — startups, job openings, sales
  leads, sponsors, grants, events — not a fixed domain.
- **Collect** — records come from REAL free public sources, selected by the
  requirement: **Arbeitnow + RemoteOK** for job openings, **GitHub** for
  sponsor opportunities, **CoinGecko** for market data. If a live source is
  unreachable the run falls back to clearly-labeled synthetic data, so it
  always completes — online or offline.
- **Quality** — canonical-key deduplication that never merges silently
  (low-confidence and fuzzy matches become review candidates), field and
  evidence validation, confidence capping, human review queue with
  resolve/reopen.
- **Deliver** — filterable records with per-source evidence, analytics
  (funding by round, locations, medians), a deterministic report, CSV/JSON
  export with formula-injection defense, and a global search (⌘K).

## Reliability

- Atomic JSON persistence with a backup per write; a corrupt file falls back to
  the backup instead of wiping the workspace.
- In-process mutex + cross-process lockfile guard read-modify-write cycles.
- Planning is a transparent background job: the UI shows each real step live
  (like a chat assistant) instead of a blocking spinner, and the user can
  leave the page.
- Run start is idempotent and runs can be cancelled mid-flight; a server
  restart mid-run is reconciled on boot — stranded runs are marked failed with
  an explanatory event and datasets that already hold records stay usable.

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — layers, data flow, crash safety
- [`docs/API.md`](docs/API.md) — endpoint contract
- [`docs/DATA_QUALITY.md`](docs/DATA_QUALITY.md) — normalization, dedupe rules, review
- [`docs/SECURITY.md`](docs/SECURITY.md) — untrusted-AI handling, keys, export
- [`docs/RUNBOOK.md`](docs/RUNBOOK.md) — setup, demo journey, recovery, reset
- `docs/archive/` — earlier design documents (superseded)

## Development

```bash
pnpm test        # 98 unit tests, node:test
pnpm typecheck
pnpm lint
pnpm build
pnpm seed        # reset workspace + planned demo task
```

## Honesty rule

All demo records are synthetic and marked as such in the UI. They must never be
presented as live external evidence. Replace the demo adapter with compliant
live source adapters only when you have permission and the provider supports
the use case.
