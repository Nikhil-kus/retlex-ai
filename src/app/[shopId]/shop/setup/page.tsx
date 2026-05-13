/**
 * /[shopId]/shop/setup
 * Multi-tenant shop setup page.
 */
'use client';

import { useShop } from '@/lib/shop-context';
import ShopSetupContent from '@/components/pages/ShopSetupContent';

export default function ShopSetupPage() {
  const { shop, shopId, loading, error, refreshShop } = useShop();

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-slate-400 text-sm">Loading...</div></div>;
  if (error || !shop) return <div className="flex items-center justify-center h-full"><div className="text-rose-500 text-sm">{error || 'Shop not found.'}</div></div>;

  return <ShopSetupContent shop={shop} shopId={shopId} onSaved={refreshShop} />;
}
