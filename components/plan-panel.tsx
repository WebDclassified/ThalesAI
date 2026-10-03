'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check, CircleAlert, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import type { ResearchPlan } from '@/lib/types';

type RunSummary = { id: string; status: string } | null;

type StepSnapshot = { label: string; detail: string; state: string; durationMs?: number };
type JobSnapshot = {
  status: 'idle' | 'running' | 'ready' | 'failed';
  source?: string;
  error?: string;
  elapsedMs: number;
  steps: StepSnapshot[];
};

const ACTIVE_RUN = new Set(['queued', 'running', 'validating']);
const TERMINAL_RUN = new Set(['completed', 'review_required', 'cancelled', 'failed']);

export function PlanPanel({
  taskId,
  status,
  plan,
  planSource,
  run,
}: {
  taskId: string;
  status: string;
  plan: ResearchPlan | null;
  planSource?: string;
  run: RunSummary;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<'idle' | 'planning' | 'ready' | 'failed'>(
    status === 'planning' ? 'planning' : plan ? 'ready' : 'idle',
  );
  const [job, setJob] = useState<JobSnapshot | null>(null);
  const [starting, setStarting] = useState(false);
  const [runError, setRunError] = useState('');
  const kickedOff = useRef(false);

  // A fresh task starts planning automatically: one action leads to a plan.
  useEffect(() => {
    if (phase !== 'idle' || kickedOff.current) return;
    kickedOff.current = true;
    void startPlanning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // While planning, poll the transparent job and mirror every step.
  useEffect(() => {
    if (phase !== 'planning') return;
    let cancelled = false;
    const controller = new AbortController();

    const poll = async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/plan-status`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!res.ok) return;
        const snapshot: JobSnapshot = await res.json();
        if (cancelled) return;
        setJob(snapshot);
        if (snapshot.status === 'ready') {
          setPhase('ready');
          router.refresh();
        } else if (snapshot.status === 'failed') {
          setPhase('failed');
        }
      } catch {
        // transient network error: next tick retries
      }
    };

    void poll();
    const timer = setInterval(poll, 500);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
    };
  }, [phase, taskId, router]);

  async function startPlanning() {
    setStarting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/plan`, { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || 'Plan generation failed.');
      setPhase('planning');
    } catch (err) {
      setPhase('failed');
      setJob((prev) => ({
        status: 'failed',
        elapsedMs: 0,
        steps: [],
        error: err instanceof Error ? err.message : 'Plan generation failed.',
      }));
    } finally {
      setStarting(false);
    }
  }

  async function startRun() {
    setRunError('');
    try {
      const res = await fetch(`/api/tasks/${taskId}/run`, { method: 'POST' });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || 'Unable to start the run.');
      router.push(`/tasks/${taskId}/run`);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Unable to start the run.');
    }
  }

  if (phase === 'planning') {
    return <PlannerStream job={job} taskId={taskId} />;
  }

  if (phase === 'failed' || (!plan && !starting)) {
    return (
      <div className="card">
        <div className="card-body stack">
          <div className="notice danger">
            <CircleAlert size={15} /> {job?.error || 'The plan could not be generated.'}
          </div>
          <div>
            <button className="btn primary" onClick={startPlanning} disabled={starting}>
              {starting ? <Loader2 className="spin" size={15} /> : 'Try again'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!plan) return null;

  const active = run ? ACTIVE_RUN.has(run.status) : false;
  const finished = run ? TERMINAL_RUN.has(run.status) : false;

  return (
    <div className="stack">
      {planSource === 'fallback' ? (
        <div className="notice warning">
          Deterministic fallback plan — the AI planner did not answer in time. The workflow is
          identical either way.
        </div>
      ) : null}

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Research plan</div>
            <div className="card-sub">
              {planSource === 'ai' ? 'Designed by AI' : 'Deterministic plan'} · {plan.fields.length - 1} fields ·{' '}
              {plan.sources.length} sources
            </div>
          </div>
          <button
            className="btn ghost"
            onClick={startPlanning}
            disabled={starting || active}
            title="Regenerate plan"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="card-body stack">
          <p style={{ fontSize: 14 }}>{plan.objective}</p>

          <div className="kv">
            <dt>Entity</dt>
            <dd>{plan.targetEntity}</dd>
            <dt>Geography</dt>
            <dd>{plan.geography || '—'}</dd>
            <dt>Time filter</dt>
            <dd>{plan.timeFilter || '—'}</dd>
            <dt>Target records</dt>
            <dd className="num">{plan.targetRecords}</dd>
          </div>

          <div>
            <div className="label">Fields</div>
            <div className="chips">
              {plan.fields.map((f) => (
                <span key={f.key} className={`chip ${f.required && f.key !== 'source' ? 'req' : ''}`}>
                  {f.label}
                  {f.required && f.key !== 'source' ? ' *' : ''}
                  <span className="chip-type">{f.type === 'source' ? 'evidence' : f.type}</span>
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="label">Sources</div>
            <div className="stack" style={{ gap: 4 }}>
              {plan.sources.map((s) => (
                <div key={`${s.name}-${s.role}`} className="row small">
                  <span className="badge neutral">{s.priority}</span>
                  <span className="grow">{s.name}</span>
                  <span className="faint">{s.role}</span>
                </div>
              ))}
            </div>
          </div>

          {plan.validationRules.length ? (
            <div>
              <div className="label">Validation rules</div>
              <div className="chips">
                {plan.validationRules.slice(0, 10).map((r, i) => (
                  <span key={`${r.field}-${i}`} className="chip mono">
                    {r.field}: {r.rule}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {runError ? <div className="notice danger">{runError}</div> : null}

      <div className="row">
        {active ? (
          <Link className="btn primary" href={`/tasks/${taskId}/run`}>
            <Loader2 className="spin" size={15} /> Run in progress
          </Link>
        ) : finished ? (
          <Link
            className="btn primary"
            href={run?.status === 'review_required' ? '/review' : `/datasets/${taskId}`}
          >
            {run?.status === 'review_required' ? 'Open review queue' : 'Open dataset'}{' '}
            <ArrowRight size={15} />
          </Link>
        ) : (
          <button className="btn primary" onClick={startRun}>
            <Sparkles size={15} /> Run collection
          </button>
        )}
        {run && finished ? (
          <Link className="btn ghost" href={`/tasks/${taskId}/run`}>
            Last run
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** The transparent, ChatGPT-style view of what the planner is doing right now. */
function PlannerStream({ job, taskId }: { job: JobSnapshot | null; taskId: string }) {
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (startedAt.current === null) startedAt.current = Date.now();
    const anchor = startedAt.current;
    const timer = setInterval(
      () => setElapsed(Math.round((Date.now() - anchor) / 100) / 10),
      100,
    );
    return () => clearInterval(timer);
  }, []);

  const steps = job?.steps?.length
    ? job.steps
    : [
        { label: 'Reading the requirement', detail: '', state: 'active', durationMs: undefined },
        { label: 'Designing the field schema', detail: '', state: 'pending', durationMs: undefined },
        { label: 'Consulting the AI planner', detail: '', state: 'pending', durationMs: undefined },
        { label: 'Validating the plan', detail: '', state: 'pending', durationMs: undefined },
      ];

  return (
    <div className="card">
      <div className="card-head">
        <div className="row">
          <Sparkles size={15} className="accent-icon" />
          <span className="card-title">Planning</span>
          <span className="faint small num">{elapsed.toFixed(1)}s</span>
        </div>
        <Link className="btn ghost" href="/tasks">
          Tasks
        </Link>
      </div>
      <div className="card-body">
        <div className="planner-stream" aria-live="polite">
          {steps.map((step) => (
            <div key={step.label} className={`planner-step ${step.state}`}>
              <span className="planner-icon">
                {step.state === 'active' ? (
                  <Loader2 className="spin" size={14} />
                ) : step.state === 'done' ? (
                  <Check size={13} strokeWidth={3} />
                ) : step.state === 'failed' ? (
                  <CircleAlert size={13} />
                ) : (
                  <span className="planner-dot" />
                )}
              </span>
              <span className="planner-text">
                <span className="planner-label">{step.label}</span>
                {step.detail ? <span className="planner-detail">{step.detail}</span> : null}
              </span>
              {step.durationMs ? (
                <span className="planner-duration num">{(step.durationMs / 1000).toFixed(1)}s</span>
              ) : null}
            </div>
          ))}
        </div>
        <p className="faint small" style={{ marginTop: 14 }}>
          You can leave this page — the plan is being built in the background and will appear on
          the task automatically.
        </p>
      </div>
    </div>
  );
}
