import Link from 'next/link';
import { readState } from '@/lib/db';
import { Badge, Empty, PageHeader } from '@/components/ui';
import { IssueActions } from '@/components/issue-actions';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const state = await readState();
  const issues = [...state.issues].sort((a, b) =>
    a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === 'open' ? -1 : 1,
  );
  const open = issues.filter((i) => i.status === 'open').length;

  return (
    <>
      <PageHeader
        title="Review"
        sub="Possible duplicates and incomplete records that a human must decide on."
        action={
          <Badge tone={open ? 'warning' : 'success'}>
            {open ? `${open} open` : 'All clear'}
          </Badge>
        }
      />

      {!issues.length ? (
        <Empty
          title="Nothing to review"
          body="Issues appear here when validation or deduplication flags a record."
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Record</th>
                  <th>Issue</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => {
                  const record = state.records.find((r) => r.id === issue.recordId);
                  return (
                    <tr key={issue.id} style={issue.status === 'resolved' ? { opacity: 0.55 } : undefined}>
                      <td>
                        {record ? (
                          <Link className="row-link" href={`/records/${record.id}`}>
                            {record.title || 'Unnamed record'}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ whiteSpace: 'normal', minWidth: 260 }}>
                        <div className="small">{issue.message}</div>
                        <div className="faint small">{issue.type}</div>
                      </td>
                      <td>
                        <Badge tone={issue.severity === 'error' ? 'danger' : 'warning'}>
                          {issue.severity}
                        </Badge>
                      </td>
                      <td className="faint">{issue.status}</td>
                      <td>
                        <IssueActions issueId={issue.id} resolved={issue.status === 'resolved'} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
