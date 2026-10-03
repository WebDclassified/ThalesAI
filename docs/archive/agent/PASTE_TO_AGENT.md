# Paste this into Claude Code / Codex / your coding agent

You are taking over an existing repository. Before changing code, read `agent/MASTER_AGENT_PROMPT.md` and the docs it references.

This is **ThalesAI — AI-Powered Data Intelligence Platform** for Team Thales.

Important context: the team already has an **OpenAI-compatible AI API**. Do NOT replace it with Ollama or a paid provider. Configure it using:

```env
AI_BASE_URL=https://YOUR_PROVIDER/v1
AI_API_KEY=YOUR_API_KEY
AI_MODEL=YOUR_MODEL
AI_JSON_SCHEMA=true
```

Use native server-side `fetch` to `/chat/completions`. Never expose `AI_API_KEY` in client code.

Your objectives:
- keep the supplied UX and workflow;
- make the complete demo journey functional;
- use the real AI planner when configured;
- fall back safely when AI fails;
- keep demo/source data clearly labelled synthetic;
- do not invent live citations;
- maintain strong validation, deduplication and review behavior;
- do not add unnecessary paid dependencies;
- keep the app runnable with `DEMO_MODE=true`.

Start by running typecheck/build and fixing any real compile/runtime problems before adding optional features.
