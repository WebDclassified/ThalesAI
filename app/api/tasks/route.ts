import { NextResponse } from 'next/server';
import { z } from 'zod';
import { id, readState, updateState } from '@/lib/db';
import type { Task } from '@/lib/types';

const Body = z.object({
  prompt: z.string().trim().min(12).max(5000),
  name: z.string().trim().min(1).max(120).optional(),
  targetRecords: z.number().int().min(1).max(500).optional(),
});

/** A short human name derived from the prompt when the user did not provide one. */
export function deriveName(prompt: string): string {
  const flat = prompt.replace(/\s+/g, ' ').trim();
  if (flat.length <= 60) return flat;
  const cut = flat.slice(0, 60);
  const space = cut.lastIndexOf(' ');
  return `${space > 30 ? cut.slice(0, space) : cut}…`;
}

export async function GET() {
  const state = await readState();
  return NextResponse.json({ tasks: state.tasks });
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Request body must be JSON.' } },
      { status: 400 },
    );
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'INVALID_REQUEST',
          message: parsed.error.issues.map((i) => i.message).join(' '),
        },
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const task: Task = {
    id: id('task'),
    name: parsed.data.name || deriveName(parsed.data.prompt),
    prompt: parsed.data.prompt,
    status: 'draft',
    // Replaced by the plan once the planner has read the prompt.
    targetRecords: parsed.data.targetRecords ?? 50,
    createdAt: now,
    updatedAt: now,
  };

  await updateState((s) => {
    s.tasks.push(task);
  });

  return NextResponse.json({ task }, { status: 201 });
}
