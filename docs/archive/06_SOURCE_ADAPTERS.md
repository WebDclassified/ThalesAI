# Source Adapters

```ts
export interface SourceAdapter {
  id: string;
  name: string;
  capabilities: Array<'search'|'fetch'|'extract'>;
  search(ctx: SearchContext): Promise<SourceResult[]>;
  fetch?(url: string): Promise<SourceResult>;
}
```

## MockAdapter
Required. Deterministic. Core demo.

## SearXNGAdapter
Optional. SearXNG exposes a simple JSON/CSV/RSS HTTP search API. Prefer a local/self-hosted instance
when possible. Public instances can disable JSON output or impose their own limits.

## GDELTAdapter
Optional. GDELT provides public live JSON APIs including full-text document search. Its DOC 2.0 API
search window/behavior should be treated as a constraint; do not present it as a complete historical index.

## GitHubAdapter
Optional. Public API calls can be unauthenticated, but GitHub documents a 60 requests/hour unauthenticated
primary limit and additional secondary limits. Pace requests and stop on 403/429 rather than retrying rapidly.

## RSS adapter
Only use feeds whose publisher permits the intended use. Treat feed content as discovery/evidence inputs,
not a universal web search replacement.

## Adapter safety
- allowlist provider base URLs
- reject private-network/localhost URLs from user-controlled fetches
- limit redirects
- enforce timeout
- limit response size
- content-type check
- do not execute remote HTML scripts
- strip dangerous markup
- cache hashes/results
