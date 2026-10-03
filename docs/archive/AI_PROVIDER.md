# OpenAI-Compatible AI Provider

## Environment
```env
AI_BASE_URL=https://your-provider.example/v1
AI_API_KEY=your-key
AI_MODEL=your-model
AI_JSON_SCHEMA=true
AI_TIMEOUT_MS=25000
```

`AI_BASE_URL` can end at `/v1` or directly at `/chat/completions`.

## Request
The application sends a standard `POST /chat/completions` request with:
- model
- temperature 0
- system message
- user message

When `AI_JSON_SCHEMA=true`, it first requests `response_format.type=json_schema`.
If the endpoint rejects that option, it retries with a standard chat-completions body.

## Response handling
Expected path:
`choices[0].message.content`

Then:
1. remove optional markdown fences
2. parse JSON
3. validate with Zod
4. reject values outside bounded limits
5. persist only validated plans

## Fallback
If credentials are missing, endpoint fails, request times out, content is empty, JSON is malformed or Zod rejects the object, the deterministic local planner is used.
The UI labels it as a safe fallback.

## Cost control
Only planning is AI-backed in the MVP. Demo extraction is deterministic so the same dataset does not consume repeated model calls.
Report generation is deterministic by default; add AI report generation only when explicitly enabled.
