import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Export Hub',
};

export default function ExportsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
