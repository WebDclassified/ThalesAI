# Edge-Case Matrix

## Prompt input
- empty / whitespace-only
- too short
- oversized
- contradictory constraints
- unsafe or prompt-injection language
- request for secrets or access-control bypass
- target count <1 or >500
- duplicate fields
- malformed field keys

## AI
- missing API config
- HTTP timeout
- 401/403
- 429
- 5xx
- unsupported response_format
- empty response
- malformed JSON
- schema mismatch
- model returns code instead of JSON
- provider returns claims of execution without evidence

## Data
- missing required field
- invalid URL
- negative funding
- missing city
- missing evidence
- conflicting values
- duplicate record
- same company with different source evidence
- low-confidence fuzzy match
- Unicode/punctuation/company-suffix variants

## Workflow
- double-click start
- two tabs start
- page refresh during run
- process crash after partial work
- partial source failure
- event stream unavailable
- export before ready
- zero valid records
- report after state change

## Source safety
- never bypass access controls
- never fabricate citations
- never allow arbitrary SSRF-prone server fetches
- use provider/source allowlists for live adapters
- bounded concurrency and backoff

## Expected behavior
No silent false success. Preserve successful work, expose the affected stage, record the error and show the safest available recovery action.
