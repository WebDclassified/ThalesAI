# API Contract

POST /api/tasks
Create task.

POST /api/tasks/:taskId/plan
Create/recreate plan.

POST /api/runs
Start run.

POST /api/runs/:runId/cancel
Cancel run if cancellable.

GET /api/runs/:runId/events
SSE progress events.

GET /api/datasets/:datasetId
Dataset metadata.

GET /api/datasets/:datasetId/records?q=&city=&round=&status=&limit=&cursor=
Search/filter/paginate.

GET /api/records/:recordId
Record + evidence + issues.

POST /api/review/:issueId/resolve
Resolve an issue with explicit action and note.

POST /api/reports
Generate report from validated dataset.

GET /api/datasets/:datasetId/export?format=csv|json
Export.

Error:
{ "error": { "code": "...", "message": "...", "requestId": "..." } }
