'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, RotateCcw } from 'lucide-react';

/** Resolve / reopen a review issue, then refresh the server-rendered list. */
export function IssueActions({ issueId, resolved }: { issueId: string; resolved: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await fetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: !resolved }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className={`btn ${resolved ? 'ghost' : 'secondary'}`}
      onClick={toggle}
      disabled={busy}
      title={resolved ? 'Reopen issue' : 'Accept record and resolve'}
    >
      {resolved ? <RotateCcw size={13} /> : <Check size={13} />}
      {resolved ? 'Reopen' : 'Resolve'}
    </button>
  );
}
