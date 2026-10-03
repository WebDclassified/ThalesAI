# AI Planner and Extraction

## ResearchPlan schema

- objective: string
- targetEntity: string
- geography: string | null
- timeFilter: string | null
- targetRecords: number
- fields: array of { key, label, type, required }
- sources: array of { name, role, priority }
- steps: array of { id, label }
- validationRules: array of { field, rule }

## Planner rules
- Do not invent sources.
- Do not claim data has been collected during planning.
- Do not output executable code.
- Do not output secrets.
- Do not create a source outside the enabled source registry.
- Keep plans bounded: max sources, max queries, max records, max fields.

## Ollama
Use local `/api/chat` and pass a JSON schema in the `format` field. Validate returned JSON with Zod.
Use a low-temperature/deterministic configuration where supported.

## Extraction
Prefer schema-guided extraction. Every extracted field should carry a confidence/evidence link when
possible. If a source does not support a field, leave it null and create a review issue instead of guessing.
