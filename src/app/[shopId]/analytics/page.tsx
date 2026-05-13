/**
 * /[shopId]/analytics
 * Multi-tenant analytics page.
 * Converted from server component to client component so it uses ShopContext.
 */
'use client';

import { useShop } from '@/lib/shop-context';
import AnalyticsPageContent from '@/components/pages/AnalyticsPageContent';

export default function ShopAnalyticsPage() {
  const { shop, shopId, loading, error } = useShop();

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-slate-400 text-sm">Loading...</div></div>;
  if (error || !shop) return <div className="flex items-center justify-center h-full"><div className="text-rose-500 text-sm">{error || 'Shop not found.'}</div></div>;

  return <AnalyticsPageContent shop={shop} shopId={shopId} />;
}
