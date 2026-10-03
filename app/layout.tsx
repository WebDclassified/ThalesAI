import type { Metadata } from 'next';
import './globals.css';
import { Shell } from '@/components/shell';
import { runtimeStatus } from '@/lib/config';
import { readState } from '@/lib/db';
import { reconcileOnBoot } from '@/lib/recovery';

export const metadata: Metadata = {
  title: 'ThalesAI',
  description: 'AI-powered data intelligence platform by Team Thales.',
  icons: { icon: '/assets/brand/favicon.svg' },
};

// Status and review counts are read from local state at request time, and boot
// recovery must run before anything renders a possibly-stranded run.
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await reconcileOnBoot();
  const [status, state] = await Promise.all([runtimeStatus(), readState()]);
  const openIssues = state.issues.filter((i) => i.status === 'open').length;

  return (
    <html lang="en">
      <body>
        <Shell status={status} openIssues={openIssues}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
