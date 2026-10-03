import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readState } from '@/lib/db';
import { PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await readState();
  const report = state.reports.find((r) => r.id === id);
  if (!report) notFound();

  const dataset = state.datasets.find((d) => d.id === report.datasetId);

  return (
    <>
      <PageHeader
        title={report.title}
        sub={
          <span className="row" style={{ gap: 10 }}>
            <span>Generated {new Date(report.createdAt).toLocaleString()}</span>
            {dataset ? (
              <Link className="small muted" href={`/datasets/${dataset.id}`}>
                {dataset.name}
              </Link>
            ) : null}
          </span>
        }
      />

      <div className="stack" style={{ maxWidth: 860 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Summary</div>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 14, lineHeight: 1.7 }}>{report.executiveSummary}</p>
          </div>
        </div>

        {report.findings.map((f) => (
          <div className="card" key={f.title}>
            <div className="card-body">
              <div className="card-title" style={{ marginBottom: 6 }}>
                {f.title}
              </div>
              <p className="small muted" style={{ lineHeight: 1.65 }}>
                {f.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
