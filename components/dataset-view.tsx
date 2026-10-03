'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Download, FileText, Loader2, Search } from 'lucide-react';
import { BarList, Metric, StatusBadge } from '@/components/ui';
import { formatMoney, summarizeDataset } from '@/lib/analytics';
import { fieldKind, fieldValueText } from '@/lib/plan-fields';
import type { Dataset, PlanField, RecordData, RecordStatus } from '@/lib/types';

type SourceSummary = { name: string; provider: string; url: string; count: number; share: number };
type ReportSummary = {
  id: string;
  title: string;
  executiveSummary: string;
  findings: Array<{ title: string; body: string }>;
} | null;

const TABS = ['Records', 'Analytics', 'Sources', 'Report'] as const;
type Tab = (typeof TABS)[number];

const STATUS_TONE: Record<RecordStatus, 'success' | 'warning' | 'danger'> = {
  valid: 'success',
  review: 'warning',
  invalid: 'danger',
};

function cellText(field: PlanField, record: RecordData): string {
  const kind = fieldKind(field);
  const value = record.fields[field.key];
  if (kind === 'money' && typeof value === 'number') return formatMoney(value);
  return fieldValueText(value) || '—';
}

export function DatasetView({
  dataset,
  records,
  fields,
  report,
  synthetic,
}: {
  dataset: Dataset;
  records: RecordData[];
  fields: PlanField[];
  report: ReportSummary;
  synthetic: boolean;
}) {
  const [tab, setTab] = useState<Tab>('Records');
  const ready = dataset.status === 'ready';

  return (
    <>
      {synthetic ? (
        <div className="notice warning" style={{ marginBottom: 16 }}>
          Records are synthetic demo data, not live evidence.
        </div>
      ) : null}

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Records' ? (
        <RecordsTab datasetId={dataset.id} records={records} fields={fields} ready={ready} />
      ) : null}
      {tab === 'Analytics' ? <AnalyticsTab records={records} fields={fields} ready={ready} /> : null}
      {tab === 'Sources' ? <SourcesTab records={records} /> : null}
      {tab === 'Report' ? (
        <ReportTab dataset={dataset} report={report} ready={ready} />
      ) : null}
    </>
  );
}

/* ---------- records ---------- */

function RecordsTab({
  datasetId,
  records,
  fields,
  ready,
}: {
  datasetId: string;
  records: RecordData[];
  fields: PlanField[];
  ready: boolean;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | RecordStatus>('all');
  const columns = fields.filter((f) => f.key !== 'source').slice(0, 6);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.filter((r) => {
      const haystack = [r.title, ...Object.values(r.fields).map((v) => (Array.isArray(v) ? v.join(' ') : String(v)))]
        .join(' ')
        .toLowerCase();
      return (!needle || haystack.includes(needle)) && (status === 'all' || r.status === status);
    });
  }, [records, query, status]);

  if (!ready) {
    return (
      <div className="card">
        <div className="empty">
          <h3>Collecting…</h3>
          <p>Records appear once the run finishes.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <div className="search" style={{ width: 320, maxWidth: '100%' }}>
          <span className="search-icon">
            <Search size={14} />
          </span>
          <input
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter records"
            aria-label="Filter records"
          />
        </div>
        <select
          className="input"
          style={{ width: 150 }}
          aria-label="Filter status"
          value={status}
          onChange={(e) => setStatus(e.target.value as 'all' | RecordStatus)}
        >
          <option value="all">All statuses</option>
          <option value="valid">Valid</option>
          <option value="review">Review</option>
          <option value="invalid">Invalid</option>
        </select>
        <div className="grow" />
        <span className="faint small">
          {filtered.length} / {records.length}
        </span>
        <a className="btn secondary" href={`/api/datasets/${datasetId}/export?format=csv`}>
          <Download size={14} /> CSV
        </a>
        <a className="btn secondary" href={`/api/datasets/${datasetId}/export?format=json`}>
          <Download size={14} /> JSON
        </a>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {columns.map((f) => (
                  <th key={f.key}>{f.label}</th>
                ))}
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  {columns.map((f, i) => (
                    <td key={f.key}>
                      {i === 0 ? (
                        <Link className="row-link" href={`/records/${r.id}`}>
                          {cellText(f, r)}
                        </Link>
                      ) : (
                        cellText(f, r)
                      )}
                    </td>
                  ))}
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={columns.length + 1}>
                    <div className="faint small" style={{ padding: '18px 16px', textAlign: 'center' }}>
                      No matching records.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ---------- analytics ---------- */

function AnalyticsTab({
  records,
  fields,
  ready,
}: {
  records: RecordData[];
  fields: PlanField[];
  ready: boolean;
}) {
  if (!ready) {
    return (
      <div className="card">
        <div className="empty">
          <h3>Collecting…</h3>
          <p>Analytics become available once the run finishes.</p>
        </div>
      </div>
    );
  }

  const s = summarizeDataset(records, fields);
  const numericMetrics = s.numerics.slice(0, 2);

  return (
    <>
      <div className="grid-4" style={{ marginBottom: 12 }}>
        <Metric value={String(s.recordCount)} label="Records" />
        <Metric
          value={`${Math.round((s.validCount / Math.max(s.recordCount, 1)) * 100)}%`}
          label="Valid"
        />
        {numericMetrics.map((n) => (
          <Metric key={n.key} value={formatMoney(n.total)} label={`Total ${n.label.toLowerCase()}`} />
        ))}
        {numericMetrics.length === 1 ? <Metric value={String(s.sourceGroups)} label="Source groups" /> : null}
        {numericMetrics.length === 0 ? (
          <>
            <Metric value={String(s.sourceGroups)} label="Source groups" />
            <Metric value={String(s.categories.length)} label="Category fields" />
          </>
        ) : null}
      </div>

      {s.numerics.length || s.categories.length ? (
        <div className="grid-2">
          {s.categories.slice(0, 1).map((c) => (
            <div className="card" key={c.key}>
              <div className="card-head">
                <div className="card-title">{c.label}</div>
                <span className="faint small">{c.distinct} distinct</span>
              </div>
              <div className="card-body">
                <BarList items={c.items.map((i) => ({ ...i, share: i.share }))} />
              </div>
            </div>
          ))}
          {s.categories.slice(1, 2).map((c) => (
            <div className="card" key={c.key}>
              <div className="card-head">
                <div className="card-title">{c.label}</div>
                <span className="faint small">{c.distinct} distinct</span>
              </div>
              <div className="card-body">
                <BarList items={c.items.map((i) => ({ ...i, share: i.share }))} />
              </div>
            </div>
          ))}
          {s.categories.length === 1 && s.numerics.length ? (
            <div className="card">
              <div className="card-head">
                <div className="card-title">{s.numerics[0].label}</div>
              </div>
              <div className="card-body">
                <div className="metric-value">{formatMoney(s.numerics[0].median)}</div>
                <div className="metric-label">Median per record</div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="card">
          <div className="card-body muted small">No aggregatable fields in this plan.</div>
        </div>
      )}
    </>
  );
}

/* ---------- sources ---------- */

function SourcesTab({ records }: { records: RecordData[] }) {
  const sources = useMemo(() => {
    const map = new Map<string, SourceSummary>();
    for (const r of records) {
      for (const src of r.sources) {
        const existing = map.get(src.name);
        if (existing) existing.count += 1;
        else
          map.set(src.name, {
            name: src.name,
            provider: src.provider,
            url: src.url,
            count: 1,
            share: 0,
          });
      }
    }
    const list = [...map.values()].sort((a, b) => b.count - a.count);
    const max = Math.max(...list.map((s) => s.count), 1);
    for (const s of list) s.share = s.count / max;
    return list;
  }, [records]);

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Evidence sources</div>
        <span className="faint small">{sources.length} distinct</span>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Source</th>
              <th>Provider</th>
              <th>Records cited</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.name}>
                <td>
                  <div>{s.name}</div>
                  <div className="faint small mono">{s.url}</div>
                </td>
                <td>{s.provider}</td>
                <td className="num">{s.count}</td>
              </tr>
            ))}
            {!sources.length ? (
              <tr>
                <td colSpan={3}>
                  <div className="faint small" style={{ padding: '18px 16px', textAlign: 'center' }}>
                    No sources recorded.
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- report ---------- */

function ReportTab({
  dataset,
  report,
  ready,
}: {
  dataset: Dataset;
  report: ReportSummary;
  ready: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId: dataset.id }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || 'Report generation failed.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report generation failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="card">
        <div className="empty">
          <h3>Collecting…</h3>
          <p>Reports become available once the run finishes.</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="card">
        <div className="empty">
          <div className="empty-icon">
            <FileText size={18} />
          </div>
          <h3>No report yet</h3>
          <p>Generate a summary with quality and coverage findings from the dataset.</p>
          <button className="btn primary" onClick={generate} disabled={busy}>
            {busy ? <Loader2 className="spin" size={15} /> : 'Generate report'}
          </button>
          {error ? (
            <div className="notice danger" style={{ marginTop: 12 }}>
              {error}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">{report.title}</div>
            <div className="card-sub">Deterministic summary of recorded dataset facts.</div>
          </div>
          <Link className="btn secondary" href={`/reports/${report.id}`}>
            Open
          </Link>
        </div>
        <div className="card-body">
          <p style={{ fontSize: 13.5, lineHeight: 1.65 }}>{report.executiveSummary}</p>
        </div>
      </div>
      {report.findings.map((f) => (
        <div className="card" key={f.title}>
          <div className="card-body">
            <div className="card-title" style={{ marginBottom: 6 }}>
              {f.title}
            </div>
            <p className="small muted" style={{ lineHeight: 1.6 }}>
              {f.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
