# Live Source Boundary

The problem statement expects data from permitted sources. The final MVP therefore exposes the source layer as an architectural boundary, but defaults to synthetic deterministic records.

To add live collection:

1. Create a `SourceAdapter` implementation.
2. Restrict it to approved/allowed providers.
3. Add request timeouts, size limits and bounded concurrency.
4. Store source URLs, titles, timestamps and evidence.
5. Never bypass authentication, paywalls, CAPTCHAs or access restrictions.
6. Run extraction through the same normalization, deduplication and validation pipeline.

Do not add an arbitrary server-side URL fetcher to the UI; that introduces SSRF risk.
