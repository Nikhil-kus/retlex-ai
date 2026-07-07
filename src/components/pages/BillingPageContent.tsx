'use client';

/**
 * BillingPageContent
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin wrapper that re-exports the existing BillingPage with shopId injected
 * via ShopContext. The actual billing UI lives in src/app/billing/page.tsx
 * and is preserved unchanged for backward compatibility.
 *
 * The existing billing page already reads shopId from shopCache/fetch('/api/shop').
 * Since ShopProvider pre-populates shopCache with the correct shop before
 * rendering this component, the existing page will pick it up from cache
 * without making a redundant network request.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect } from 'react';
import { shopCache } from '@/lib/session-cache';
import type { Shop } from '@/types';

// Direct import — no dynamic() needed. This component is already only rendered
// after ShopProvider has resolved (loading=false), so there is no circular dep
// concern: the billing page is a sibling route, not an ancestor.
import LegacyBillingPage from '@/app/billing/page';

interface Props {
  shop: Shop;
  shopId: string;
}

export default function BillingPageContent({ shop, shopId }: Props) {
  // Pre-populate the session cache so the legacy page finds the right shop
  // without making a redundant /api/shop fetch
  useEffect(() => {
    shopCache.set(shop);
  }, [shop]);

  return <LegacyBillingPage />;
}
