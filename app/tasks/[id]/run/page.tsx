import { notFound, redirect } from 'next/navigation';
import { readState } from '@/lib/db';
import { RunClient } from '@/components/run-client';

export const dynamic = 'force-dynamic';

export default async function RunPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ runId?: string }>;
}) {
  const { id } = await params;
  const qs = await searchParams;
  const state = await readState();
  const task = state.tasks.find((t) => t.id === id);
  if (!task) notFound();

  const runId = qs.runId || task.latestRunId;
  if (!runId || !state.runs.some((r) => r.id === runId)) redirect(`/tasks/${id}`);

  return <RunClient taskId={id} taskName={task.name} runId={runId} />;
}
