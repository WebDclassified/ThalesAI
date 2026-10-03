/**
 * Seed the local workspace with one ready-to-run demo task.
 *
 * Run with `pnpm seed`. Uses the deterministic planner so no AI credentials are
 * required, and resets any previous run so the result is reproducible.
 */
import { id, readState, resetState, updateState } from './db';
import { DEMO_PROMPT } from './demo';
import { fallbackPlanFrom } from './ai';
import type { Task } from './types';

async function main(): Promise<void> {
  const now = new Date().toISOString();

  await resetState();

  const task: Task = {
    id: id('task'),
    name: 'AI Startup Funding — India 2026',
    prompt: DEMO_PROMPT,
    status: 'planned',
    targetRecords: 50,
    createdAt: now,
    updatedAt: now,
    plan: fallbackPlanFrom(DEMO_PROMPT),
    planSource: 'fallback',
  };

  await updateState((s) => {
    s.tasks.push(task);
  });

  const state = await readState();
  console.log('Seeded ThalesAI workspace.');
  console.log(`  tasks:    ${state.tasks.length}`);
  console.log(`  task id:  ${task.id}`);
  console.log(`  plan:     ${task.plan?.targetRecords ?? 0} target records, sources ${task.plan?.sources.length ?? 0}`);
  console.log('');
  console.log('Next: pnpm dev  ->  http://localhost:3000/tasks');
  console.log(`Open the task "${task.name}" and start a collection run.`);
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
