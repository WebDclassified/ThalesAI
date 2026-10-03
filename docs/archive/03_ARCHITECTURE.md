# Zero-Cost Architecture

Browser
  ↓
Next.js App Router
  ├─ Server Components: dashboard/data pages
  ├─ Client Components: forms/tables/progress
  └─ Route Handlers / Server Actions
       ↓
Application Services
  ├─ Task Service
  ├─ Planner Service
  ├─ Workflow Engine
  ├─ Validation Service
  └─ Export Service
       ↓
SQLite + Drizzle

Planner
  ├─ DeterministicDemoPlanner
  └─ OllamaPlanner

Sources
  ├─ MockSourceAdapter
  ├─ SearXNGAdapter (optional, user-operated/local preferred)
  ├─ GDELTAdapter (optional public API)
  ├─ GitHubAdapter (public API, rate limited)
  └─ GenericRssAdapter (only for feeds that permit the use)

Quality pipeline
  collect → extract → normalize → canonicalize → deduplicate → validate → review

Why SQLite:
SQLite is single-file, serverless and zero-configuration; its core is public domain.
Why Ollama:
Local model inference avoids per-token API bills. Ollama provides local chat, structured output
and embeddings endpoints.
