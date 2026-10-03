# Research verification — 2026-10-02

## Problem brief
https://hackcultureplatform.blob.core.windows.net/event-assets/hackathons/6a9084220579dffec28137de/problem_explanation_5wtdx1p941f.pdf

The supplied one-page brief was visually inspected. It specifies a prompt-based AI Data Intelligence
Platform that understands natural-language data requirements, dynamically designs/executes collection
workflows, gathers from permitted sources, cleans/structures/validates/deduplicates results, provides
source-backed traceability, interactive dashboarding, task monitoring, history, search/filter/export,
and a managed end-to-end workflow.

## Current technical references
Next.js docs: https://nextjs.org/docs
Tailwind Next.js setup: https://tailwindcss.com/docs/installation/framework-guides/nextjs
shadcn Next.js setup: https://ui.shadcn.com/docs/installation/next
Drizzle node:sqlite: https://orm.drizzle.team/docs/get-started/node-sqlite-new
SQLite: https://sqlite.org/about.html and https://www.sqlite.org/copyright.html
Ollama chat: https://docs.ollama.com/api/chat
Ollama structured outputs: https://docs.ollama.com/capabilities/structured-outputs
Ollama embeddings: https://docs.ollama.com/capabilities/embeddings
Ollama Qwen3 4B: https://ollama.com/library/qwen3:4b
SearXNG search API: https://docs.searxng.org/dev/search_api.html
GDELT: https://gdeltproject.org/data.html
GitHub rate limits: https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api

## Versions observed during research
Next 16.3.8 latest; React 19.3.0; Tailwind 4.3.3; Drizzle ORM 0.45.3; Zod 4.6.5;
Ollama JS 0.6.4; better-sqlite3 13.0.3; lucide-react 1.49.0.
Use current stable releases at build time rather than relying on these observed versions indefinitely.
