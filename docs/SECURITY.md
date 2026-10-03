# Security posture

Scope: local, single-user hackathon MVP. No authentication is shipped; do not
expose the server to untrusted networks.

## AI output is untrusted input

- The planner's completion is stripped (markdown fences), salvaged (first
  parseable balanced JSON object), and validated with a bounded Zod schema
  (1–500 records, ≤ 25 fields, ≤ 15 sources, ≤ 12 steps, ≤ 30 rules) before
  anything is persisted.
- Structured output uses a strict-mode-compliant JSON schema; a provider that
  rejects it falls back to a JSON-only retry, and any failure falls back to the
  deterministic planner. Provenance (`ai` vs `fallback`) is recorded.
- The system prompt isolates the user message as data, never instructions, and
  refuses paywall/CAPTCHA/auth bypass requests.

## Keys

- `AI_API_KEY` is read server-side only; it never reaches the client bundle and
  is never rendered. `runtimeStatus()` exposes booleans and the model name only.
- `.env` and `.data/` are gitignored.

## Input handling

- Every route validates its body with Zod and returns typed error codes.
- Numbers are bounded (`targetRecords` 1–500); strings are length-capped.
- `POST /api/reset` requires an explicit `{"confirm": true}` body.

## Export

- Filenames derive only from our own ids, sanitized defensively.
- CSV cells: quotes doubled, newlines collapsed, leading `=+-@` neutralized with
  an apostrophe (formula-injection defense).

## Source adapters

The demo adapter is fully synthetic (`.invalid` reserved TLD). A live adapter
must implement the same interface and should enforce SSRF guards (no private/
loopback/link-local/metadata targets, HTTP(S) only, response size and MIME
limits) before registration.
