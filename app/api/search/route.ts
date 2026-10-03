import { NextResponse } from 'next/server';
import { readState } from '@/lib/db';

export const runtime = 'nodejs';

type Hit = { id: string; title: string; sub: string; href: string };

const LIMIT = 5;

/** Minimal global search across tasks, datasets and record companies. */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') || '').trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ tasks: [], datasets: [], records: [] });

  const s = await readState();

  const tasks: Hit[] = s.tasks
    .filter((t) => t.name.toLowerCase().includes(q) || t.prompt.toLowerCase().includes(q))
    .slice(0, LIMIT)
    .map((t) => ({ id: t.id, title: t.name, sub: `Task · ${t.status}`, href: `/tasks/${t.id}` }));

  const datasets: Hit[] = s.datasets
    .filter((d) => d.name.toLowerCase().includes(q))
    .slice(0, LIMIT)
    .map((d) => ({
      id: d.id,
      title: d.name,
      sub: `Dataset · ${d.recordCount} records`,
      href: `/datasets/${d.id}`,
    }));

  const records: Hit[] = s.records
    .filter((r) => {
      const haystack = [r.title, ...Object.values(r.fields).map((v) => (Array.isArray(v) ? v.join(' ') : String(v)))]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, LIMIT)
    .map((r) => {
      const dataset = s.datasets.find((d) => d.id === r.datasetId);
      return {
        id: r.id,
        title: r.title,
        sub: `Record · ${dataset?.name || 'Dataset'}`,
        href: `/records/${r.id}`,
      };
    });

  return NextResponse.json({ tasks, datasets, records });
}
