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

export default async function DatasetsPage() {
  const state = await readState();
  const datasets = [...state.datasets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <>
      <PageHeader title="Datasets" sub="Validated outputs of collection runs." />

      {!datasets.length ? (
        <Empty
          title="No datasets yet"
          body="Run a task to produce a validated, source-backed dataset."
          actionHref="/tasks/new"
          actionLabel="New task"
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Dataset</th>
                  <th>Status</th>
                  <th>Records</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link className="row-link" href={`/datasets/${d.id}`}>
                        {d.name}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="num">{d.recordCount}</td>
                    <td className="faint">{when(d.updatedAt)}</td>
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
