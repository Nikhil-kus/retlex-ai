/**
 * /[shopId]/history
 * Multi-tenant bill history page.
 */
'use client';

import { useShop } from '@/lib/shop-context';
import HistoryPageContent from '@/components/pages/HistoryPageContent';

export default function ShopHistoryPage() {
  const { shop, shopId, loading, error } = useShop();

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-slate-400 text-sm">Loading...</div></div>;
  if (error || !shop) return <div className="flex items-center justify-center h-full"><div className="text-rose-500 text-sm">{error || 'Shop not found.'}</div></div>;

  return <HistoryPageContent shop={shop} shopId={shopId} />;
}
