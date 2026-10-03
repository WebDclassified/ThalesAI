import Link from 'next/link';
import { readState } from '@/lib/db';
import { Empty, PageHeader, StatusBadge } from '@/components/ui';

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

export default async function TasksPage() {
  const state = await readState();
  const tasks = [...state.tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <>
      <PageHeader title="Tasks" sub="Every research request, its plan and its runs." />

      {!tasks.length ? (
        <Empty
          title="No tasks yet"
          body="Describe what data you need and the platform takes it from there."
          actionHref="/tasks/new"
          actionLabel="New task"
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Target</th>
                  <th>Plan</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link className="row-link" href={`/tasks/${t.id}`}>
                        {t.name}
                      </Link>
                      <div className="faint small" style={{ maxWidth: 460, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.prompt}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="num">{t.targetRecords}</td>
                    <td>{t.planSource === 'ai' ? 'AI' : t.plan ? 'fallback' : '—'}</td>
                    <td className="faint">{when(t.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
