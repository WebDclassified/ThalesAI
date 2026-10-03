import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card">
      <div className="empty">
        <h3>Not found</h3>
        <p>The page or item you requested does not exist.</p>
        <Link className="btn primary" href="/">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
