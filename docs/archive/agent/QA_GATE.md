# QA Gate

Before declaring completion:
- `DEMO_MODE=true` works with no credentials.
- Typecheck/build pass.
- Critical unit/integration tests pass.
- Start is idempotent.
- Refresh does not lose workflow state.
- Source failures do not corrupt successful results.
- AI output is Zod-validated.
- SSRF/private-network checks exist.
- No paid provider is mandatory.
- Search/filter/export operate locally.
- No body horizontal overflow at 1280/1440/1920.
- Keyboard/focus/error/loading states are usable.
