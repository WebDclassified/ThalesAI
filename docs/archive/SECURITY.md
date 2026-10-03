# Security & Safety

- AI credentials are server-side only.
- Do not print API keys in logs or UI.
- Validate all LLM JSON with Zod.
- Bound prompt length, field count, source count, step count and target record count.
- Never execute code returned by the LLM.
- Never let the LLM invent evidence URLs that are treated as live facts.
- Any future live URL fetcher must implement HTTPS-only, DNS/IP checks, redirect limits,
  content-size limits, MIME checks and a source allowlist to prevent SSRF.
- Do not bypass authentication, paywalls, CAPTCHAs or robots/access controls.
- External requests must have timeouts, backoff and bounded concurrency.
- File exports must use controlled filenames and safe encodings.
