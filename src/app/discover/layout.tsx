import type { Metadata } from 'next';

// Scope the canonical production host to the public experience and its OG image.
export const metadata: Metadata = { metadataBase: new URL('https://retlex.shop') };

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
