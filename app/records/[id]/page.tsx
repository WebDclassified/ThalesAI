import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { readState } from '@/lib/db';
import { fieldKind, fieldValueText } from '@/lib/plan-fields';
import { formatMoney } from '@/lib/analytics';
import { PageHeader, StatusBadge } from '@/components/ui';
import { IssueActions } from '@/components/issue-actions';

export const dynamic = 'force-dynamic';

export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await readState();
  const record = state.records.find((r) => r.id === id);
  if (!record) notFound();

  const dataset = state.datasets.find((d) => d.id === record.datasetId);
  const task = dataset ? state.tasks.find((t) => t.id === dataset.taskId) : undefined;
  const fields = task?.plan?.fields ?? Object.keys(record.fields).map((key) => ({ key, label: key.replaceAll('_', ' '), required: false, type: 'text' }));
  const dataFields = fields.filter((f) => f.key !== 'source');
  const issues = state.issues.filter((i) => i.recordId === record.id);

  const rows = dataFields.map((field) => {
    const value = record.fields[field.key];
    let node: React.ReactNode = fieldValueText(value) || '—';
    const kind = fieldKind(field);
    if (kind === 'money' && typeof value === 'number') node = formatMoney(value);
    else if (kind === 'url' && typeof value === 'string' && value) {
      node = (
        <a className="row-link" href={value} target="_blank" rel="noreferrer">
          {value}
        </a>
      );
    } else if (kind === 'email' && typeof value === 'string' && value.includes('@')) {
      node = <a className="row-link" href={`mailto:${value}`}>{value}</a>;
    }
    return { label: field.label, node };
  });

  return (
    <>
      <PageHeader
        title={record.title || 'Record'}
        sub={
          <span className="row" style={{ gap: 10 }}>
            <StatusBadge status={record.status} />
            {dataset ? (
              <Link className="small muted" href={`/datasets/${dataset.id}`}>
                {dataset.name}
              </Link>
            ) : null}
          </span>
        }
      />

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Fields</div>
          </div>
          <div className="card-body">
            <dl className="kv">
              {rows.map(({ label, node }) => (
                <div key={label} style={{ display: 'contents' }}>
                  <dt>{label}</dt>
                  <dd>{node}</dd>
                </div>
              ))}
              <div style={{ display: 'contents' }}>
                <dt>Confidence</dt>
                <dd>{`${Math.round(record.confidence * 100)}%`}</dd>
              </div>
              <div style={{ display: 'contents' }}>
                <dt>Canonical key</dt>
                <dd>
                  <span className="mono">{record.canonicalKey || '—'}</span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="stack">
          {issues.length ? (
            <div className="card">
              <div className="card-head">
                <div className="card-title">Issues</div>
                <span className="faint small">
                  {issues.filter((i) => i.status === 'open').length} open
                </span>
              </div>
              <div className="card-body stack" style={{ gap: 10 }}>
                {issues.map((issue) => (
                  <div className="row" key={issue.id} style={{ alignItems: 'flex-start' }}>
                    <div className="grow">
                      <div className="small">{issue.message}</div>
                      <div className="faint small" style={{ marginTop: 2 }}>
                        {issue.type} · {issue.status}
                        {issue.field ? ` · ${issue.field}` : ''}
                      </div>
                    </div>
                    <IssueActions issueId={issue.id} resolved={issue.status === 'resolved'} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="card">
            <div className="card-head">
              <div className="card-title">Evidence</div>
              <span className="faint small">{record.sources.length} source(s)</span>
            </div>
            <div className="card-body stack" style={{ gap: 14 }}>
              {record.sources.map((src) => (
                <div key={src.id} className="stack" style={{ gap: 4 }}>
                  <div className="row">
                    <span className="small" style={{ fontWeight: 550 }}>
                      {src.title}
                    </span>
                    <div className="grow" />
                    <a
                      className="row-link small"
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      title={src.url}
                    >
                      Open <ExternalLink size={12} style={{ display: 'inline', verticalAlign: -1 }} />
                    </a>
                  </div>
                  <div className="faint small">
                    {src.name} · {src.provider} · fetched{' '}
                    {new Date(src.fetchedAt).toLocaleString()}
                  </div>
                  <div className="small muted">
                    {Object.entries(src.evidence).map(([k, v]) => (
                      <div key={k}>
                        <span className="mono faint">{k}</span> {v}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!record.sources.length ? (
                <div className="faint small">No evidence attached.</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
