import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readState } from '@/lib/db';
import { PageHeader, StatusBadge } from '@/components/ui';
import { DatasetView } from '@/components/dataset-view';

export const dynamic = 'force-dynamic';

export default async function DatasetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await readState();
  const dataset = state.datasets.find((d) => d.id === id || d.taskId === id);
  if (!dataset) notFound();

  const records = state.records.filter((r) => r.datasetId === dataset.id);
  const recordIds = new Set(records.map((r) => r.id));
  const openIssues = state.issues.filter((i) => recordIds.has(i.recordId) && i.status === 'open');
  const report = [...state.reports]
    .filter((r) => r.datasetId === dataset.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const task = state.tasks.find((t) => t.id === dataset.taskId);
  const synthetic = records.every((r) => r.sources.every((s) => s.provider === 'synthetic-demo'));

  return (
    <>
      <PageHeader
        title={dataset.name}
        sub={
          <span className="row" style={{ gap: 10 }}>
            <StatusBadge status={dataset.status} />
            <span className="num">{records.length} records</span>
            {openIssues.length ? (
              <Link href="/review" className="small" style={{ color: 'var(--warning)' }}>
                {openIssues.length} need review
              </Link>
            ) : null}
            {task ? (
              <Link href={`/tasks/${task.id}`} className="small muted">
                Task
              </Link>
            ) : null}
          </span>
        }
      />

      <DatasetView
        dataset={dataset}
        records={records}
        fields={task?.plan?.fields ?? []}
        synthetic={synthetic}
        report={
          report
            ? {
                id: report.id,
                title: report.title,
                executiveSummary: report.executiveSummary,
                findings: report.findings,
              }
            : null
        }
      />
    </>
  );
}
