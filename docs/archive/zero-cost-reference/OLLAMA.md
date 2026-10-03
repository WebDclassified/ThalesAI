# Ollama — Zero-Cost Local AI

Ollama exposes a local API on `http://localhost:11434`. Its chat endpoint supports JSON or a JSON Schema
in the `format` field, which is suitable for a strict ResearchPlan contract. It also exposes an embeddings
API for semantic retrieval.

## Recommended model for the demo
`qwen3:4b` — approximately 2.5 GB download on the current Ollama library listing and Apache 2.0.

Alternative smaller option:
`gemma3:1b` — approximately 815 MB. Check the model's current terms before distribution.

## Install
Windows PowerShell:
```powershell
irm https://ollama.com/install.ps1 | iex
ollama pull qwen3:4b
```

Then verify:
```powershell
ollama list
```

## Planner call
Use the official JavaScript client or native fetch. Keep it server-side.

Example request shape:
```json
{
  "model":"qwen3:4b",
  "messages":[
    {"role":"system","content":"Return only a ResearchPlan matching the schema."},
    {"role":"user","content":"Find AI startups in India..."}
  ],
  "stream":false,
  "format": {"type":"object","properties":{}}
}
```

## Failure behavior
If Ollama cannot be reached:
- do not crash
- use deterministic local planner
- show `Demo planner` / `Local AI unavailable`
- keep the rest of the product functional
