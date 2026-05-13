/**
 * /[shopId]/worker
 * Multi-tenant worker order queue page.
 */
'use client';

import { useShop } from '@/lib/shop-context';
import WorkerPageContent from '@/components/pages/WorkerPageContent';

export default function ShopWorkerPage() {
  const { shop, shopId, loading, error } = useShop();

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-slate-400 text-sm">Loading...</div></div>;
  if (error || !shop) return <div className="flex items-center justify-center h-full"><div className="text-rose-500 text-sm">{error || 'Shop not found.'}</div></div>;

  return <WorkerPageContent shop={shop} shopId={shopId} />;
}
