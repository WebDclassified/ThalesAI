# Data Model

## workspaces
id, name, slug, created_at

## users
id, workspace_id, name, email, role, created_at

## tasks
id, workspace_id, name, prompt, status, target_records, created_by, created_at, updated_at

## research_plans
id, task_id, version, objective, target_entity, geography, time_filter,
fields_json, sources_json, steps_json, validation_rules_json, created_at

## workflow_runs
id, task_id, plan_id, status, started_at, finished_at,
records_discovered, records_extracted, records_validated, duplicates_removed, error_json

## workflow_steps
id, run_id, step_key, label, status, progress, message, attempt, started_at, finished_at

## sources
id, workspace_id, name, type, provider, base_url, role, priority, enabled

## source_documents
id, run_id, source_id, url, title, content_hash, fetched_at, status, content_excerpt

## datasets
id, task_id, workspace_id, name, status, record_count, created_at, updated_at

## records
id, dataset_id, canonical_key, payload_json, confidence, validation_status,
first_seen_at, updated_at

## record_sources
id, record_id, source_document_id, evidence_json, captured_at

## validation_issues
id, record_id, issue_type, field_name, message, severity, status, resolution_note, created_at

## exports
id, dataset_id, format, status, file_path, created_at

Add indexes for workspace/task/run/dataset foreign keys, canonical keys, validation status and
searchable normalized names.
