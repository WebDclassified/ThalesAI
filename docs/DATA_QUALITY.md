# Data quality

All quality logic is pure, deterministic, and unit-tested (`tests/`).

## Normalization

- `normalize`: NFKC → trim → collapse whitespace → lowercase.
- `hostname`: lowercase, `www.` stripped, null when the URL is unparseable.
- `canonicalKey`: `normalized(company) | hostname`, falling back to
  `normalized(company) | normalized(city)` when there is no parseable URL.

## Validation (`lib/validation.ts`)

Per record, most severe first:

- **invalid** — company name missing.
- **review** — founders empty, city missing, website unparseable, funding
  negative/non-numeric/zero, no source evidence, confidence < 0.5.

Record status comes from the worst finding. Confidence is **capped** for
imperfect records (≤ 0.3 invalid, ≤ 0.72 review) and never inflated.

## Deduplication

1. Equal canonical key + both confidences ≥ `AUTO_MERGE_MIN_CONFIDENCE` (0.6) →
   merge, retaining all evidence from both sides (founders union, max confidence).
2. Same key but low confidence → both rows kept, pair reported as a candidate.
3. Same hostname, different keys → candidate only; suppressed when the host is
   shared by more than `HOST_ENTITY_KEY_LIMIT` (5) distinct keys (a publisher
   host, not an entity domain).
4. Fuzzy name (Dice ≥ 0.82 over bigrams) in the same city **plus** a shared
   founder → candidate only. A shared founder alone is never sufficient.

Nothing merges without meeting rule 1; every other signal becomes a review
issue a human resolves on the Review page.

## Review resolution (`lib/review.ts`)

Resolving the last open issue on a record is a human acceptance: the record
becomes `valid` (its machine confidence is left untouched) and, when the whole
dataset is accepted, the task completes. Reopening returns the record to
`review`.
