# AI API Setup

Create `.env.local`:

```env
DEMO_MODE=false
AI_BASE_URL=https://YOUR_PROVIDER/v1
AI_API_KEY=YOUR_API_KEY
AI_MODEL=YOUR_MODEL
AI_JSON_SCHEMA=true
AI_TIMEOUT_MS=25000
```

The application expects an OpenAI-compatible Chat Completions endpoint:

`POST {AI_BASE_URL}/chat/completions`

Request uses:
- `model`
- `temperature: 0`
- `messages`
- optional `response_format` JSON schema

The app retries without `response_format` if the provider rejects structured output.
If the provider still fails, a deterministic plan is returned so the product does not stop.

Do not commit `.env.local` or any provider key to GitHub.
