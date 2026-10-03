# Zero-Cost Demo Runbook

## Goal
Run the full product locally before the hackathon submission without spending money.

## Fast path
1. Install Node.js 22+.
2. Install Ollama.
3. Pull `qwen3:4b` if the machine can run it.
4. Clone/open the project.
5. Copy `.env.example` → `.env.local`.
6. Set `DEMO_MODE=true`.
7. Install packages.
8. Run database migration/seed.
9. Start Next.js.
10. Open `http://localhost:3000`.

## If Ollama is too slow
Set:
`OLLAMA_ENABLED=false`

The deterministic planner and mock collection still produce the full demonstration path.
This keeps the demo at $0 and avoids hardware/model latency risk.

## Demo prompt
“Find 50 AI startups in India that raised funding in 2026. Include company name, founders,
funding amount, latest round, website, city and a source for every record.”

## Demo explanation
The sample data is synthetic. Say so if the viewer asks. The architecture is designed to replace
the mock adapter with permitted live adapters without changing the workflow or UI.
