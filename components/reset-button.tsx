'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function ResetButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function reset() {
    if (!window.confirm('Delete all tasks, datasets, records and reports?')) return;
    setBusy(true);
    try {
      await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      router.push('/');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn danger" onClick={reset} disabled={busy}>
      {busy ? <Loader2 className="spin" size={14} /> : 'Reset workspace'}
    </button>
  );
}
