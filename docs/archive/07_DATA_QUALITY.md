# Data Quality

## Statuses
- `valid`
- `review_required`
- `invalid`

## Normalize
- trim/collapse whitespace
- normalize Unicode
- normalize company name case for matching only
- lowercase/normalize hostnames
- canonicalize URLs without deleting meaningful path information
- parse money into amount/currency/raw
- map round aliases into controlled labels

## Deduplicate
1. Exact company + hostname → duplicate.
2. Exact hostname → merge candidate.
3. Normalized company + same city → review candidate.
4. Never auto-merge low-confidence pairs.

## Evidence
A source claim is not proof by itself. Preserve the exact source URL/title/fetch time. Keep field-level
evidence where practical.

## Review issues
Examples:
- missing_required_field
- conflicting_value
- invalid_url
- duplicate_candidate
- stale_information
- source_unavailable
- unsupported_currency
- malformed_source
