/**
 * /[shopId]/billing
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-tenant billing page.
 * Delegates to the shared BillingPageContent component, passing shopId
 * from the URL (via ShopContext) instead of fetching /api/shop.
 * ─────────────────────────────────────────────────────────────────────────────
 */
'use client';

import { useShop } from '@/lib/shop-context';
import BillingPageContent from '@/components/pages/BillingPageContent';

export default function ShopBillingPage() {
  const { shop, shopId, loading, error } = useShop();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400 text-sm">Loading shop...</div>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-rose-500 text-sm">
          {error || 'Shop not found. Check the URL.'}
        </div>
      </div>
    );
  }

  return <BillingPageContent shop={shop} shopId={shopId} />;
}
