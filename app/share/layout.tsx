import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shared report',
  // Shared snapshots are personal data; keep them out of search engines.
  robots: { index: false, follow: false },
};

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
