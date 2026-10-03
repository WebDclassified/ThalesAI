export type TaskStatus =
  | 'draft'
  | 'planning'
  | 'planned'
  | 'ready'
  | 'running'
  | 'validating'
  | 'review'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type RunStatus =
  | 'queued'
  | 'running'
  | 'validating'
  | 'review_required'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type RecordStatus = 'valid' | 'review' | 'invalid';

export type PlanField = {
  key: string;
  label: string;
  required: boolean;
  /**
   * One of `text | list | money | number | url | date | email | source` after
   * normalization. The AI planner may return free-form type strings; they are
   * coerced by lib/plan-fields before anything downstream consumes them.
   */
  type: string;
};

export type ResearchPlan = {
  objective: string;
  targetEntity: string;
  geography?: string | null;
  timeFilter?: string | null;
  targetRecords: number;
  fields: PlanField[];
  sources: Array<{ name: string; role: string; priority: 'high' | 'medium' | 'low' }>;
  steps: Array<{ id: string; label: string }>;
  validationRules: Array<{ field: string; rule: string }>;
};

export type SourceRef = {
  id: string;
  name: string;
  url: string;
  title: string;
  provider: string;
  fetchedAt: string;
  evidence: Record<string, string>;
};

/**
 * A collected record is schema-flexible: the shape comes from the research plan,
 * so the same pipeline handles startups, job openings, sales leads or any other
 * requirement. `title` is the display value of the plan's primary field and
 * `fields` holds every collected value keyed by the plan's field keys.
 */
export type RecordData = {
  id: string;
  datasetId: string;
  title: string;
  fields: Record<string, string | number | string[]>;
  canonicalKey: string;
  confidence: number;
  status: RecordStatus;
  sources: SourceRef[];
  createdAt: string;
  updatedAt: string;
};

export type ValidationIssue = {
  id: string;
  recordId: string;
  type: string;
  field?: string;
  message: string;
  severity: 'warning' | 'error';
  status: 'open' | 'resolved';
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
};

export type Task = {
  id: string;
  name: string;
  prompt: string;
  status: TaskStatus;
  targetRecords: number;
  createdAt: string;
  updatedAt: string;
  plan?: ResearchPlan;
  planSource?: 'ai' | 'fallback' | 'demo';
  datasetId?: string;
  latestRunId?: string;
};

export type WorkflowEvent = {
  id: string;
  runId: string;
  type: string;
  step: string;
  progress: number;
  message: string;
  createdAt: string;
};

export type WorkflowRun = {
  id: string;
  taskId: string;
  status: RunStatus;
  startedAt?: string;
  finishedAt?: string;
  overallProgress: number;
  recordsDiscovered: number;
  recordsExtracted: number;
  recordsValidated: number;
  duplicatesRemoved: number;
};

export type Dataset = {
  id: string;
  taskId: string;
  name: string;
  /** `failed` is set by recovery when a run died before persisting any records. */
  status: 'processing' | 'ready' | 'failed';
  recordCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Report = {
  id: string;
  datasetId: string;
  title: string;
  executiveSummary: string;
  findings: Array<{ title: string; body: string }>;
  createdAt: string;
};

export type AppState = {
  tasks: Task[];
  runs: WorkflowRun[];
  events: WorkflowEvent[];
  datasets: Dataset[];
  records: RecordData[];
  issues: ValidationIssue[];
  reports: Report[];
};

/**
 * Source adapter boundary.
 *
 * The workflow engine only ever talks to a `SourceAdapter`; it has no knowledge of
 * where records come from. The shipped demo adapter is deterministic, synthetic and
 * generates records from the plan's fields. A permitted live adapter implements this
 * same interface and is selected explicitly at runtime, so live-collection code never
 * spreads through the application.
 */
export type CollectionRequest = {
  runId: string;
  datasetId: string;
  plan: ResearchPlan;
  targetRecords: number;
};

export type CollectionResult = {
  /** Records produced by the adapter, before normalization/dedupe/validation. */
  records: RecordData[];
  /** How many candidates the adapter found, including any it could not extract. */
  discovered: number;
  /** Distinct source names that contributed at least one record. */
  sourcesUsed: string[];
};

export interface SourceAdapter {
  readonly id: string;
  readonly label: string;
  /** True only for adapters that contact a real external service. */
  readonly live: boolean;
  collect(request: CollectionRequest): Promise<CollectionResult>;
}

/** A pair the deduper refused to merge automatically and routed to human review. */
export type DedupeCandidate = {
  keptId: string;
  incomingId: string;
  title: string;
  reason: string;
  similarity: number;
};

export type DedupeResult = {
  rows: RecordData[];
  /** Number of records folded into an existing row. */
  removed: number;
  /** Possible duplicates deliberately NOT merged, per DATA_QUALITY.md rules 2-4. */
  candidates: DedupeCandidate[];
};

/** A validation finding before it is persisted as a `ValidationIssue`. */
export type ValidationFinding = {
  field?: string;
  message: string;
  severity: 'warning' | 'error';
  /** Status the record should carry if this is the most severe finding. */
  outcome: RecordStatus;
};
