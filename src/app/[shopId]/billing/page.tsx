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

/** Matches the real billing page layout so the transition is seamless. */
function BillingSkeleton() {
  return (
    <div className="flex flex-col max-w-7xl mx-auto h-full bg-white animate-pulse">
      {/* Tab bar */}
      <div className="flex border-b border-slate-100 flex-shrink-0">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 h-12 flex items-center justify-center gap-2 px-3">
            <div className="w-4 h-4 rounded bg-slate-200" />
            <div className="h-3 w-16 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="h-10 rounded-xl bg-slate-100" />
      </div>

      {/* Category grid — 3 columns, 2 rows */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

export default function ShopBillingPage() {
  const { shop, shopId, loading, error } = useShop();

  if (loading) {
    return <BillingSkeleton />;
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
