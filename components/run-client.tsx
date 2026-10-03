'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, CircleAlert } from 'lucide-react';
import { PageHeader, Progress, StatusBadge } from '@/components/ui';
import type { WorkflowEvent, WorkflowRun } from '@/lib/types';

/** Progress value at which each stage is considered complete. Mirrors lib/workflow.ts. */
const STAGES = [
  { id: 'discover', label: 'Discover sources', doneAt: 24 },
  { id: 'extract', label: 'Extract fields', doneAt: 40 },
  { id: 'normalize', label: 'Normalize values', doneAt: 58 },
  { id: 'deduplicate', label: 'Deduplicate', doneAt: 78 },
  { id: 'validate', label: 'Validate evidence', doneAt: 92 },
  { id: 'finalize', label: 'Finalize dataset', doneAt: 100 },
];

const POLL_MS = 800;
const TERMINAL = new Set(['completed', 'review_required', 'failed']);

function stageIndex(progress: number): number {
  const found = STAGES.findIndex((stage) => progress < stage.doneAt);
  return found === -1 ? STAGES.length : found;
}

export function RunClient({
  taskId,
  taskName,
  runId,
}: {
  taskId: string;
  taskName: string;
  runId: string;
}) {
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const runRef = useRef<WorkflowRun | null>(null);

  async function cancel() {
    setCancelling(true);
    try {
      await fetch(`/api/tasks/${taskId}/cancel`, { method: 'POST' });
      // The next poll picks up the cancelled state.
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async (): Promise<void> => {
      try {
        const res = await fetch(
          `/api/tasks/${taskId}/events?runId=${encodeURIComponent(runId)}`,
          { cache: 'no-store', signal: controller.signal },
        );
        if (!res.ok) throw new Error(`Unable to load the run (${res.status}).`);
        const payload = await res.json();
        if (cancelled) return;
        runRef.current = payload.run;
        setRun(payload.run);
        setEvents(payload.events ?? []);
        setError('');
      } catch (err) {
        if (cancelled || (err instanceof Error && err.name === 'AbortError')) return;
        setError(err instanceof Error ? err.message : 'Unable to load the run.');
      }
    };

    void load();
    // One interval that stops itself once the run reaches a terminal state
    // (read through a ref so the guard sees the latest value); cleanup cancels
    // in-flight fetches on unmount.
    const timer = setInterval(() => {
      if (runRef.current && TERMINAL.has(runRef.current.status)) return;
      void load();
    }, POLL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
    };
  }, [taskId, runId]);

  const done = run ? TERMINAL.has(run.status) : false;
  const current = useMemo(() => (done ? STAGES.length : stageIndex(run?.overallProgress ?? 0)), [run, done]);

  return (
    <>
      <PageHeader
        title={taskName}
        sub="Collection run"
        action={
          <>
            <Link className="btn secondary" href={`/tasks/${taskId}`}>
              Task
            </Link>
            {run && !TERMINAL.has(run.status) ? (
              <button className="btn danger" onClick={cancel} disabled={cancelling}>
                Cancel run
              </button>
            ) : null}
            {run && TERMINAL.has(run.status) ? (
              <Link
                className="btn primary"
                href={run.status === 'failed' || run.status === 'cancelled' ? `/tasks/${taskId}` : `/datasets/${taskId}`}
              >
                {run.status === 'review_required' ? 'Review records' : 'Open dataset'}
                {run.status === 'completed' || run.status === 'review_required' ? <ArrowRight size={15} /> : null}
              </Link>
            ) : null}
          </>
        }
      />

      {error ? (
        <div className="notice danger" style={{ marginBottom: 16 }}>
          <CircleAlert size={15} /> {error}
        </div>
      ) : null}

      <div className="grid-4" style={{ marginBottom: 12 }}>
        <div className="card metric">
          <div className="metric-value">{run ? `${run.overallProgress}%` : '—'}</div>
          <div className="metric-label">Progress</div>
        </div>
        <div className="card metric">
          <div className="metric-value">{run?.recordsDiscovered ?? '—'}</div>
          <div className="metric-label">Discovered</div>
        </div>
        <div className="card metric">
          <div className="metric-value">{run?.recordsValidated ?? '—'}</div>
          <div className="metric-label">Passed validation</div>
        </div>
        <div className="card metric">
          <div className="metric-value">{run?.duplicatesRemoved ?? '—'}</div>
          <div className="metric-label">Duplicates merged</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Stages</div>
            {run ? <StatusBadge status={run.status} /> : null}
          </div>
          <div className="card-body">
            <div style={{ marginBottom: 16 }}>
              <Progress value={run?.overallProgress ?? 0} />
            </div>
            <div className="stages">
              {STAGES.map((stage, i) => {
                const state = i < current ? 'done' : i === current ? 'current' : '';
                return (
                  <div key={stage.id} className={`stage ${state}`}>
                    <span className="stage-dot">
                      <Check size={11} strokeWidth={3} />
                    </span>
                    <span className="stage-name">{stage.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Activity</div>
          </div>
          <div className="card-body">
            <div className="timeline">
              {events
                .slice(-12)
                .reverse()
                .map((e) => (
                  <div className="event" key={e.id}>
                    <span className="event-time">
                      {new Date(e.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <span className={`event-text ${e.type !== 'progress' ? 'strong' : ''}`}>
                      {e.message}
                    </span>
                  </div>
                ))}
              {!events.length ? <div className="faint small">Waiting for events…</div> : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
