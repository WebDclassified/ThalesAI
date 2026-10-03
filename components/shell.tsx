'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, Sparkles } from 'lucide-react';
import { GlobalSearch } from '@/components/global-search';
import type { RuntimeStatus } from '@/lib/config';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/datasets', label: 'Datasets' },
  { href: '/review', label: 'Review' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings', label: 'Settings' },
];

export function Shell({
  children,
  status,
  openIssues,
}: {
  children: React.ReactNode;
  status: RuntimeStatus;
  openIssues: number;
}) {
  const pathname = usePathname() || '';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Sparkles size={14} />
          </span>
          <span className="brand-name">ThalesAI</span>
        </Link>

        <nav className="nav">
          {NAV.map(({ href, label }) => {
            const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} className={`nav-item ${active ? 'active' : ''}`}>
                {label}
                {href === '/review' && openIssues > 0 ? (
                  <span className="nav-count">{openIssues}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="side-footer">
          <div
            className={`mode-chip ${status.collectionMode === 'live' ? '' : 'warn'}`}
            title={status.collectionNote}
          >
            <span />
            {status.collectionMode === 'live' ? 'Live sources' : 'Demo data'}
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <GlobalSearch />
          <div className="grow" />
          <Link className="btn primary" href="/tasks/new">
            <Plus size={15} /> New task
          </Link>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
