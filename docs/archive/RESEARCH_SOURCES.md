# Research Sources — checked 2026-10-02

## Hackathon problem statement
Problem Statement 01 supplied by the user:
https://hackcultureplatform.blob.core.windows.net/event-assets/hackathons/6a9084220579dffec28137de/problem_explanation_5wtdx1p941f.pdf

The brief requires natural-language requirements, dynamic collection workflows, multiple permitted sources, processing/validation/deduplication, source traceability, dashboarding, task management/history, search/filter/export, and a managed end-to-end workflow.

## Next.js
https://nextjs.org/docs
Current security release information checked today lists Next.js 16.3.8 as Active LTS.

## React
https://react.dev/versions
React's current release page lists React 19.3.0 as the latest major release.

## OpenAI API
https://developers.openai.com/api/reference/cli/resources/chat/subresources/completions
The Chat Completions API remains a documented POST `/chat/completions` interface. The app uses the compatible shape through native fetch.

## Drizzle (architectural reference)
https://orm.drizzle.team/docs/sqlite/get-started-sqlite
Drizzle documents SQLite support with multiple drivers. It is not required for the zero-setup demo persistence layer, but remains a clean path for a future DB migration.
