import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readState } from '@/lib/db';
import { PageHeader, Progress, StatusBadge, WorkflowStrip } from '@/components/ui';
import { PlanPanel } from '@/components/plan-panel';
import { TaskDelete } from '@/components/task-delete';

export const dynamic = 'force-dynamic';

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await readState();
  const task = state.tasks.find((t) => t.id === id);
  if (!task) notFound();

  const runs = state.runs
    .filter((r) => r.taskId === id)
    .sort((a, b) => b.id.localeCompare(a.id));
  const latest = task.latestRunId ? state.runs.find((r) => r.id === task.latestRunId) : undefined;
  const dataset = task.datasetId ? state.datasets.find((d) => d.id === task.datasetId) : undefined;

  return (
    <>
      <PageHeader
        title={task.name}
        sub={task.prompt}
        action={
          <>
            {dataset && dataset.status !== 'processing' ? (
              <Link className="btn secondary" href={`/datasets/${dataset.id}`}>
                Dataset
              </Link>
            ) : null}
            <TaskDelete taskId={task.id} />
          </>
        }
      />

      <WorkflowStrip hasPlan={Boolean(task.plan)} status={task.status} />

      <div className="stack">
        <PlanPanel
          taskId={task.id}
          status={task.status}
          plan={task.plan ?? null}
          planSource={task.planSource}
          run={latest ? { id: latest.id, status: latest.status } : null}
        />

        {runs.length ? (
          <div className="card">
            <div className="card-head">
              <div className="card-title">Runs</div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Discovered</th>
                    <th>Validated</th>
                    <th>Duplicates merged</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td style={{ minWidth: 140 }}>
                        <div className="row">
                          <Progress value={r.overallProgress} />
                          <span className="faint small num">{r.overallProgress}%</span>
                        </div>
                      </td>
                      <td className="num">{r.recordsDiscovered}</td>
                      <td className="num">{r.recordsValidated}</td>
                      <td className="num">{r.duplicatesRemoved}</td>
                      <td>
                        <Link className="btn ghost" href={`/tasks/${task.id}/run?runId=${r.id}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
