# Test Plan

## Unit
- ResearchPlan schema validation
- prompt limits
- money parsing
- URL normalization
- hostname canonicalization
- round mapping
- canonical key generation
- duplicate classification
- evidence policy
- review resolution
- CSV escaping
- SSRF/private-IP validation

## Integration
- task creation
- plan generation
- run start/idempotency
- progress events
- cancellation
- refresh/reconnect
- source failure isolation
- normalization/dedup/validation
- review resolution
- dataset search/filter/pagination
- record evidence
- analytics
- report
- CSV/JSON export
- task history

## Acceptance
Test at 1280, 1440, 1920 desktop widths. Confirm no body overflow, no overlapping controls,
visible focus states, readable loading/error/empty states and status text that does not rely on color alone.
