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

// Dynamically import the existing billing page to avoid circular deps
import dynamic from 'next/dynamic';
const LegacyBillingPage = dynamic(() => import('@/app/billing/page'), { ssr: false });

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
