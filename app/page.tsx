import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PageHeader, StatusBadge } from '@/components/ui';
import { readState } from '@/lib/db';

export const dynamic = 'force-dynamic';

function when(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function DashboardPage() {
  const state = await readState();
  const tasks = [...state.tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const datasets = [...state.datasets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const openIssues = state.issues.filter((i) => i.status === 'open').length;

  if (!state.tasks.length) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="card">
          <div className="empty">
            <h3>Describe the data you need</h3>
            <p>
              ThalesAI plans the research, collects records with source evidence, validates and
              deduplicates them, then hands you a clean dataset.
            </p>
            <Link className="btn primary" href="/tasks/new">
              <Plus size={15} /> New task
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" />

      <div className="grid-4" style={{ marginBottom: 12 }}>
        <div className="card metric">
          <div className="metric-value">{state.tasks.length}</div>
          <div className="metric-label">Tasks</div>
        </div>
        <div className="card metric">
          <div className="metric-value">{state.records.length}</div>
          <div className="metric-label">Records collected</div>
        </div>
        <div className="card metric">
          <div className="metric-value">{datasets.length}</div>
          <div className="metric-label">Datasets</div>
        </div>
        <div className="card metric">
          <div className="metric-value">{openIssues}</div>
          <div className="metric-label">Open review items</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Recent tasks</div>
            <Link className="btn ghost" href="/tasks">
              All
            </Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {tasks.slice(0, 6).map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link className="row-link" href={`/tasks/${t.id}`}>
                        {t.name}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="faint">{when(t.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div className="card-title">Review queue</div>
              <Link className="btn ghost" href="/review">
                Open
              </Link>
            </div>
            <div className="card-body">
              {openIssues ? (
                <>
                  <div className="metric-value" style={{ fontSize: 20 }}>
                    {openIssues}
                  </div>
                  <div className="metric-label">records need a decision</div>
                </>
              ) : (
                <p className="muted small">Nothing waiting for review.</p>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Latest dataset</div>
            </div>
            <div className="card-body">
              {datasets[0] ? (
                <>
                  <Link className="row-link" href={`/datasets/${datasets[0].id}`}>
                    {datasets[0].name}
                  </Link>
                  <div className="row" style={{ marginTop: 6 }}>
                    <span className="small muted num">{datasets[0].recordCount} records</span>
                    <StatusBadge status={datasets[0].status} />
                  </div>
                </>
              ) : (
                <p className="muted small">No dataset yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
