import Link from 'next/link';
import { readState } from '@/lib/db';
import { Empty, PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const state = await readState();
  const reports = [...state.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <PageHeader title="Reports" sub="Deterministic summaries of collected datasets." />

      {!reports.length ? (
        <Empty
          title="No reports yet"
          body="Open a ready dataset and generate its report."
          actionHref="/datasets"
          actionLabel="Datasets"
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Dataset</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link className="row-link" href={`/reports/${r.id}`}>
                        {r.title}
                      </Link>
                    </td>
                    <td className="muted">
                      {state.datasets.find((d) => d.id === r.datasetId)?.name || '—'}
                    </td>
                    <td className="faint">{new Date(r.createdAt).toLocaleString()}</td>
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
