# Cost Control / No-Bill Guardrails

The project must remain usable with no paid API key. Add CI/static checks that fail if runtime code
imports or requires these by default:
- openai
- @mendable/firecrawl-js
- clerk
- stripe
- neon hosted DB clients
- paid search providers

Optional provider adapters may exist behind explicit environment flags, but they must never be required
for `DEMO_MODE=true`.

Recommended env:
```
DEMO_MODE=true
OLLAMA_ENABLED=false
DB_FILE_NAME=./data/thalesai.sqlite
```

A future live mode can set `OLLAMA_ENABLED=true` without introducing a paid API bill.
