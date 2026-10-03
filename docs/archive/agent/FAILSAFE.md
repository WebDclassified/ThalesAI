# Failsafe Behavior

The application must remain useful when:
- Ollama is not installed
- a local model is missing
- an external source times out
- a source returns malformed HTML/JSON
- a dataset is empty
- AI returns malformed structured output
- SQLite is locked
- a workflow is interrupted
- a user refreshes during collection
- an export fails
- a duplicate match is ambiguous

Never fail the whole product because an optional provider fails.
Show the failed step, preserve successful data, and provide a clear recovery action.
