# Why the final MVP uses local JSON persistence

The hackathon demo should be easy to run on a fresh Windows machine.
A hosted database adds credentials, network dependencies, schema setup and another failure surface.
The storage boundary is isolated in `lib/db.ts`, so migration to SQLite/Postgres later is straightforward.

For the submission demo, local persistence is enough to demonstrate the required task/workflow/dataset lifecycle.
