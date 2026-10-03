'use client';

import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card">
      <div className="empty">
        <h3>Something went wrong</h3>
        <p>{error.message || 'An unexpected error occurred.'}</p>
        {error.digest ? <p className="faint small mono">{error.digest}</p> : null}
        <div className="toolbar" style={{ justifyContent: 'center' }}>
          <button className="btn primary" onClick={reset}>
            Retry
          </button>
          <Link className="btn secondary" href="/">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
