# Security and Privacy

## Secrets
Never put provider keys in browser bundles or NEXT_PUBLIC_*.

## SSRF prevention
Any generic URL fetcher must reject:
- localhost
- 127.0.0.0/8
- 10.0.0.0/8
- 172.16.0.0/12
- 192.168.0.0/16
- link-local
- metadata service ranges
- file:// and non-http(s) schemes

Resolve DNS and validate the final destination after redirects where practical.

## Content handling
- maximum response size
- MIME allowlist
- timeout
- abort controller
- no script execution
- strip tracking where safe, but do not destroy evidence URLs

## Prompt injection
Treat web content as untrusted data. Never let page text override system/workflow instructions.
The extraction model receives explicit delimiters and a field schema.

## Data integrity
- transactionally persist workflow state
- idempotent step keys
- stable run IDs
- never silently overwrite evidence
- audit review decisions
