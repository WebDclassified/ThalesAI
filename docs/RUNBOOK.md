# Runbook

## Requirements

Node ≥ 20.9, pnpm (or npm).

## Run

```bash
pnpm install
pnpm dev
# http://localhost:3000
```

The app starts in demo mode: `DEMO_MODE=true` by default, data persists to
`.data/state.json`, and collection uses the deterministic synthetic adapter. No
credentials or network access are required.

## Use your own AI provider (optional)

Set in `.env` (see `.env.example`):

```env
DEMO_MODE=false          # collection still uses the demo adapter until a live adapter is registered
AI_BASE_URL=https://your-provider.example/v1
AI_API_KEY=YOUR_KEY
AI_MODEL=YOUR_MODEL
AI_JSON_SCHEMA=true
AI_TIMEOUT_MS=25000
```

Only planning calls the provider (`/chat/completions`, server-side). If it is
unavailable or returns something unusable, the deterministic planner takes over
and the UI says so.

## Local AI planner (Ollama — free, unlimited, offline)

The default `.env` points the planner at a local Ollama model, so AI planning
works with no paid API and no internet:

```bash
ollama serve                 # start the local server (skip if already running)
ollama pull qwen2.5:3b-instruct
```

`.env` then reads: `AI_BASE_URL=http://localhost:11434/v1`,
`AI_API_KEY=ollama`, `AI_MODEL=qwen2.5:3b-instruct`. Plans take ~1-3 minutes on
CPU; the task page shows the planner working live, and you can navigate away.
Any OpenAI-compatible provider (Groq, OpenRouter, OpenAI) works too — just
change the three `AI_*` variables. If the planner cannot answer, the
deterministic fallback plan keeps the product moving and is labeled as such.

## Demo journey

1. `New task` — the demo prompt (50 Indian AI startups that raised funding in
   2026) is prefilled; create the task.
2. The plan is generated automatically (AI or fallback). Press **Run
   collection**.
3. Watch the run progress live; when it finishes, open the dataset.
4. Records → filter/search; Analytics → funding and locations; Sources →
   evidence; Report → generate; Export → CSV/JSON.
5. Review → resolve or reopen flagged records.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Dev server on :3000 |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm test` | Unit tests (`node:test`) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm seed` | Reset workspace + create a planned demo task |

## Recovery

A server restart mid-run leaves no stale state: on the next request, orphaned
runs are marked failed with an explanatory event; datasets that already hold
records stay usable (`ready`), empty ones are marked failed. Start a new run to
retry.

## Reset

Settings → **Reset workspace** (asks for confirmation), or `POST /api/reset`
with `{"confirm": true}`, or `pnpm seed`.
