/**
 * /[shopId]/unpaid
 * Multi-tenant unpaid bills page.
 */
'use client';

import { useShop } from '@/lib/shop-context';
import UnpaidPageContent from '@/components/pages/UnpaidPageContent';

export default function ShopUnpaidPage() {
  const { shop, shopId, loading, error } = useShop();

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-slate-400 text-sm">Loading...</div></div>;
  if (error || !shop) return <div className="flex items-center justify-center h-full"><div className="text-rose-500 text-sm">{error || 'Shop not found.'}</div></div>;

  return <UnpaidPageContent shop={shop} shopId={shopId} />;
}
