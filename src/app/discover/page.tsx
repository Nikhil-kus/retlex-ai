import type { Metadata } from 'next';
import Discover from './Discover';

export const metadata: Metadata = {
  title: 'Retlex — Your neighbourhood, at your fingertips',
  description: 'Explore the Retlex customer demo. Discover products and compare availability at nearby shops.',
};

export default function DiscoverPage() {
  return <Discover />;
}
