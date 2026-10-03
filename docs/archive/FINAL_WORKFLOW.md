# End-to-End Workflow

1. Create task
2. Validate input bounds
3. Generate ResearchPlan
4. Show plan for human inspection
5. Start run with idempotency check
6. Discover demo candidates
7. Extract structured fields
8. Normalize values
9. Deduplicate
10. Validate required fields/evidence
11. Create review issues
12. Persist final dataset
13. Compute analytics
14. Generate report
15. Export CSV/JSON
16. Preserve task history

## Run state
queued → running → validating → review_required | completed | failed

## Task state
draft → planned → running → validating → review | completed | failed

## Recovery
- Refresh: read persisted run state.
- Duplicate Start: return existing active run.
- AI failure: fallback plan.
- Data quality failure: preserve records and add issues.
- Report failure: deterministic report.
- Export before ready: return a clear conflict response.
