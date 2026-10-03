import Link from 'next/link';
import { Check } from 'lucide-react';

/**
 * Server-safe UI primitives. No hooks, no 'use client': interactive pieces live
 * in dedicated client components.
 */

export function PageHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div className={action ? 'header-row' : ''}>
        <div>
          <h1>{title}</h1>
          {sub ? <div className="sub">{sub}</div> : null}
        </div>
        {action ? <div className="action">{action}</div> : null}
      </div>
    </div>
  );
}

/** The end-to-end workflow, always visible on the task page so the user knows where they are. */
export function WorkflowStrip({
  hasPlan,
  status,
}: {
  hasPlan: boolean;
  status: string;
}) {
  const stages = [
    { key: 'plan', label: 'Plan', done: hasPlan },
    { key: 'collect', label: 'Collect', done: ['completed', 'review', 'cancelled', 'failed'].includes(status) },
    { key: 'validate', label: 'Validate', done: ['completed', 'review', 'cancelled', 'failed'].includes(status) },
    { key: 'review', label: 'Review', done: status === 'completed' },
    { key: 'deliver', label: 'Deliver', done: status === 'completed' },
  ];
  const currentKey =
    status === 'draft'
      ? 'plan'
      : status === 'planning'
        ? 'plan'
        : ['running', 'validating', 'queued'].includes(status)
          ? 'collect'
          : status === 'review'
            ? 'review'
            : status === 'completed'
              ? 'deliver'
              : null;

  return (
    <div className="workflow-strip">
      {stages.map((stage, i) => {
        const state = stage.done ? 'done' : currentKey === stage.key ? 'current' : '';
        return (
          <span key={stage.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {i > 0 ? (
              <span className="wf-arrow" aria-hidden>
                →
              </span>
            ) : null}
            <span className={`wf-step ${state}`}>
              <span className="wf-dot" />
              {stage.label}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="card metric">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

const STATUS_TONE: Record<string, 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'> = {
  // tasks
  draft: 'neutral',
  planning: 'accent',
  planned: 'info',
  ready: 'info',
  running: 'accent',
  validating: 'accent',
  review: 'warning',
  completed: 'success',
  cancelled: 'neutral',
  failed: 'danger',
  // runs
  queued: 'neutral',
  review_required: 'warning',
  // datasets
  processing: 'accent',
  // records
  valid: 'success',
  invalid: 'danger',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{status.replaceAll('_', ' ')}</Badge>;
}

export function Empty({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="card">
      <div className="empty">
        <div className="empty-icon">
          <Check size={18} />
        </div>
        <h3>{title}</h3>
        <p>{body}</p>
        {actionHref && actionLabel ? (
          <Link className="btn primary" href={actionHref}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress">
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function BarList({
  items,
  formatValue,
}: {
  items: Array<{ label: string; count: number; share: number }>;
  formatValue?: (item: { label: string; count: number; share: number }) => string;
}) {
  if (!items.length) return <div className="faint small">No data.</div>;
  return (
    <div className="bar-list">
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <span className="truncate">{item.label}</span>
          <span className="bar-track">
            <span style={{ width: `${Math.round(item.share * 100)}%` }} />
          </span>
          <span className="bar-value">{formatValue ? formatValue(item) : item.count}</span>
        </div>
      ))}
    </div>
  );
}
