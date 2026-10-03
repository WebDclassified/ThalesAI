# Start Here

This repository is the **working MVP**, not just a design pack.

### First command
```bash
pnpm install
```

### Then
```bash
pnpm dev
```

Open `http://localhost:3000`.

### Then configure your own OpenAI-compatible AI API
Create `.env.local` from `.env.example` and set:
- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`

The application remains runnable if those values are absent because the deterministic planner fallback is enabled.

### Agent handoff
Give your coding agent the entire repository and ask it to read `agent/MASTER_AGENT_PROMPT.md` first.
