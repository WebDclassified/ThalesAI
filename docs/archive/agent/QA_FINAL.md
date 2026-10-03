# Final QA Checklist

Run:

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
pnpm dev
```

Manual:
- Create task
- Generate AI plan with AI config
- Remove AI config and verify fallback plan
- Start workflow twice and verify only one active run
- Refresh during workflow
- Inspect review queue
- Open dataset
- Open record evidence
- Open analytics
- Generate report
- Export CSV
- Export JSON
- Verify no key appears in browser network payload or UI

Known boundary:
The local JSON persistence is intended for a local hackathon MVP. A production deployment should use a durable database and a job runner.
