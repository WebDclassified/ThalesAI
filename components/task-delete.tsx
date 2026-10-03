'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';

/** Deletes the task and everything it owns, after an explicit confirmation. */
export function TaskDelete({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm('Delete this task with its runs, dataset and reports?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) {
        setBusy(false);
        return;
      }
      router.push('/tasks');
    } catch {
      setBusy(false);
    }
  }

  return (
    <button className="btn danger" onClick={remove} disabled={busy} title="Delete task">
      {busy ? <Loader2 className="spin" size={14} /> : <Trash2 size={14} />}
    </button>
  );
}
