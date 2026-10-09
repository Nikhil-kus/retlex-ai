import type { Metadata, Viewport } from 'next';
import Discover from './Discover';

export const metadata: Metadata = {
  metadataBase: new URL('https://retlex.shop'),
  title: 'Retlex AI — Find what’s nearby. Instantly.',
  description: 'Explore Retlex’s vision for nearby product discovery, powered by voice billing and digital inventory for Indian retailers. Discovery uses simulated sample data.',
  alternates: { canonical: '/discover' },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Retlex AI',
    url: '/discover',
    title: 'Find what’s nearby. Instantly. — Retlex AI',
    description: 'A searchable neighbourhood starts with connected stores. Working voice billing for retailers. An interactive concept demo for local discovery.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Retlex AI — Find what’s nearby. Instantly.',
    description: 'Working voice billing. A vision for connected local inventory. Explore the discovery concept demo.',
    images: ['/discover/opengraph-image'],
  },
  icons: { icon: [{ url: '/retlex-discover-icon.svg', type: 'image/svg+xml' }], apple: '/icon-192.png' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: '#fafaf6' };

export default function DiscoverPage() {
  return <Discover />;
}
