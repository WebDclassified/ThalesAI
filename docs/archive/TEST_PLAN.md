# Test Plan

## Unit tests
- prompt length validation
- ResearchPlan schema
- canonical key normalization
- deduplication
- validation rules
- CSV escaping

## Integration checks
- create task → stored
- plan → stored with `ai` or `fallback`
- run → one active run only
- events → persisted
- dataset → records persisted
- report → deterministic
- exports → valid CSV and JSON

## Manual smoke test
1. Fresh `.data` directory
2. Open `/tasks/new`
3. Submit default demo prompt
4. Generate plan without AI config
5. Start run
6. Refresh while running
7. Let run complete
8. Open dataset
9. Open record
10. Open analytics
11. Generate report
12. Download CSV
13. Download JSON
14. Reopen task history

## Failure drills
- unset AI variables
- set invalid AI_BASE_URL
- set very small AI timeout
- click Start twice quickly
- reload during workflow
- inspect review issue
