# Free source adapters

## Demo
MockSourceAdapter — mandatory, deterministic and local.

## SearXNG
Optional search provider. Self-hosting is preferred for control. Public instances can have their own
limits or disabled output formats.

## GDELT
Optional public document search. Treat coverage/window as a constraint rather than a complete web index.

## GitHub public API
Optional. GitHub documents 60 requests/hour for unauthenticated primary requests; search and secondary
limits also apply. Implement pacing, cache and 403/429 backoff.

## RSS
Only use feeds that permit the intended use. RSS is a source adapter, not a universal web search engine.

Do not make Google/Bing/SerpAPI/Firecrawl/Bright Data/OpenAI required.
