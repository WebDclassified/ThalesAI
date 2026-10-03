'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { DEMO_PROMPT } from '@/lib/demo';

export function TaskForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState(DEMO_PROMPT);
  const [name, setName] = useState('');
  const [target, setTarget] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (prompt.trim().length < 12) {
      setError('Describe the data you need in a little more detail (12+ characters).');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          ...(name.trim() ? { name: name.trim() } : {}),
          targetRecords: target,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error?.message || 'Could not create the task.');
      router.push(`/tasks/${payload.task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card">
      <div className="card-body">
        <div className="field">
          <label className="label" htmlFor="task-prompt">
            What data do you need?
          </label>
          <textarea
            id="task-prompt"
            className="textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={5000}
            rows={6}
          />
          <div className="hint">{prompt.length}/5000</div>
        </div>

        <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
          <div className="field grow">
            <label className="label" htmlFor="task-name">
              Name <span className="faint">(optional)</span>
            </label>
            <input
              id="task-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="Derived from the description"
            />
          </div>
          <div className="field" style={{ width: 140 }}>
            <label className="label" htmlFor="task-target">
              Records
            </label>
            <input
              id="task-target"
              className="input"
              type="number"
              min={1}
              max={500}
              value={target}
              onChange={(e) => setTarget(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
            />
          </div>
        </div>

        {error ? (
          <div className="notice danger" style={{ marginBottom: 14 }}>
            {error}
          </div>
        ) : null}

        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="spin" size={15} /> Creating…
            </>
          ) : (
            'Create task'
          )}
        </button>
      </div>
    </form>
  );
}
