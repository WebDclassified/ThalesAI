# Data Quality Rules

## Normalize
- Unicode NFKC
- trim and collapse whitespace
- lowercase hostnames
- remove `www.` when generating host key
- keep meaningful URL paths

## Canonical key
Preferred:
`normalized(company_name) + "|" + normalized_hostname`

Fallback:
`normalized(company_name) + "|" + normalized_city`

## Deduplication
1. exact key → merge and retain all evidence
2. exact normalized hostname → candidate match
3. fuzzy name + same city → review, not automatic merge
4. shared founder alone is not enough to merge
5. never drop supporting source references during merge

## Validation
Valid only when required fields and at least one evidence source are present.
Review when a required field is missing/conflicting or confidence is low.
Invalid when the data is structurally unusable.
