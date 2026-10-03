import { PageHeader } from '@/components/ui';
import { ResetButton } from '@/components/reset-button';
import { runtimeStatus } from '@/lib/config';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const status = runtimeStatus();

  const rows: Array<[string, React.ReactNode]> = [
    [
      'Planner',
      status.aiConfigured ? (
        <span>
          AI planner <span className="faint">({status.model})</span>
        </span>
      ) : (
        <span>
          Deterministic fallback <span className="faint">(no AI provider configured)</span>
        </span>
      ),
    ],
    ['Collection', status.collectionMode === 'live' ? status.collectionLabel : 'Synthetic demo sources'],
    ['Storage', 'Local JSON store (data/ directory, no external database)'],
  ];

  return (
    <>
      <PageHeader title="Settings" />

      <div className="stack" style={{ maxWidth: 720 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Runtime</div>
          </div>
          <div className="card-body">
            <dl className="kv">
              {rows.map(([label, value]) => (
                <div key={label} style={{ display: 'contents' }}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="faint small" style={{ marginTop: 14 }}>
              {status.collectionNote}
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title" style={{ color: 'var(--danger)' }}>
              Danger zone
            </div>
          </div>
          <div className="card-body row">
            <span className="grow small muted">
              Deletes every task, dataset, record and report in this workspace.
            </span>
            <ResetButton />
          </div>
        </div>
      </div>
    </>
  );
}
