# THALESAI — FINAL CODING AGENT HANDOFF

Build/finalize **ThalesAI — AI-Powered Data Intelligence Platform** for **Team Thales**.

## Read these first
1. `README.md`
2. `docs/FINAL_ARCHITECTURE.md`
3. `docs/FINAL_WORKFLOW.md`
4. `docs/AI_PROVIDER.md`
5. `docs/DATA_QUALITY.md`
6. `docs/SECURITY.md`
7. `docs/EDGE_CASE_MATRIX.md`
8. `docs/TEST_PLAN.md`
9. `docs/DEFINITION_OF_DONE.md`
10. `design/tokens.css`
11. `data/demo-state.json`
12. `prototype-reference/`

## Mission
The application must be interactive end-to-end, not a static mockup.

Core journey:
Natural-language request → AI interpretation → research plan → run → progress → validation → review → dataset → evidence → analytics → report → export → history.

## Provider requirement
The team already has an **OpenAI-compatible AI API**.
Use these server-only environment variables:
- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`

Call `${AI_BASE_URL}/chat/completions` with native `fetch` so the app remains provider-agnostic.
Never expose the key to the browser.

Try structured JSON schema output first. If the endpoint rejects that option, retry without it and ask for JSON. Validate the result with Zod. If both fail, use the deterministic safe fallback and make the fallback visible to the user.

## No-cost boundary
No paid database, paid auth, paid queue or paid scraping service is required for the demo.
The local state store in `.data/` is the default persistence mechanism. The demo source adapter is synthetic.
Optional live adapters may be added later, but they must be clearly separated from the deterministic demo adapter.

## Non-negotiable reliability rules
- Empty/short/huge prompts are validated.
- LLM output is untrusted input; Zod validation is mandatory.
- Never fabricate live URLs/evidence.
- Never bypass CAPTCHAs, paywalls, authentication or access controls.
- Do not allow arbitrary server-side URL fetching without a hardened SSRF-safe allowlist.
- Deduplication must not merge low-confidence matches silently.
- Double-click Start must not create two active runs.
- A run must have persisted state and visible progress.
- Partial failure must preserve successful records/events.
- Refreshing during a run must recover the current state.
- Export must refuse or explain when dataset is not ready.
- Report generation must work from deterministic facts when AI reporting fails.
- Demo source URLs use a reserved synthetic domain and must never be presented as real sources.

## UX
Match the supplied prototype references:
- modern light enterprise SaaS
- no gradients
- strong 8px spacing rhythm
- 14–18px cards
- accessible focus states
- readable tables
- no content overlap or horizontal overflow at desktop widths
- concise, operational copy
- subtle motion only

## Engineering rules
- TypeScript strict mode.
- Prefer server components for reads and client components for interaction.
- API routes run in Node runtime when filesystem access is needed.
- Keep provider and source adapters behind interfaces.
- Keep business logic out of UI components where practical.
- Add tests for validation, canonical keys, deduplication, plan parsing and export.
- Run `pnpm typecheck`, `pnpm build`, and tests before considering the work done.

## Completion
A fresh clone with Node installed must be able to run:

```bash
pnpm install
pnpm dev
```

Then:
1. Open the app.
2. Create the demo task.
3. Generate the plan.
4. Start a run.
5. Watch progress.
6. Review validation output.
7. Open the dataset.
8. Inspect record evidence.
9. Open analytics.
10. Generate a report.
11. Export CSV and JSON.
12. Reopen task history.

Do not claim production-readiness beyond the local hackathon MVP boundary.
