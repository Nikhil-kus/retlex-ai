'use client';

/**
 * ProductsPageContent
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps the legacy ProductsPage but overrides the shop fetch so it always
 * uses the correct shopId from the URL — not the env-pinned ACTIVE_SHOP_ID.
 *
 * Root cause of the bug: the legacy products/page.tsx calls /api/shop which
 * returns the shop pinned in .env, ignoring the URL shopId entirely.
 * Fix: seed shopCache with the correct shop before rendering, and patch the
 * legacy page to read from shopCache first.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect } from 'react';
import { shopCache, catalogCache } from '@/lib/session-cache';
import type { Shop } from '@/types';

import dynamic from 'next/dynamic';
const LegacyProductsPage = dynamic(() => import('@/app/products/page'), { ssr: false });

interface Props {
  shop: Shop;
  shopId: string;
}

export default function ProductsPageContent({ shop, shopId }: Props) {
  useEffect(() => {
    // Always overwrite the cache with the correct shop for this URL.
    // This ensures the legacy page (which reads shopCache) gets the right shop.
    const cached = shopCache.get();
    if (!cached || cached.id !== shopId) {
      // Different shop — clear stale catalog too
      catalogCache.clear();
    }
    shopCache.set(shop);
  }, [shop, shopId]);

  return <LegacyProductsPage />;
}
