'use client';

/**
 * ProductsPageContent
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin wrapper that re-exports the existing ProductsPage with shopId injected
 * via ShopContext. The actual products UI lives in src/app/products/page.tsx
 * and is preserved unchanged for backward compatibility.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect } from 'react';
import { shopCache } from '@/lib/session-cache';
import type { Shop } from '@/types';

import dynamic from 'next/dynamic';
const LegacyProductsPage = dynamic(() => import('@/app/products/page'), { ssr: false });

interface Props {
  shop: Shop;
  shopId: string;
}

export default function ProductsPageContent({ shop, shopId }: Props) {
  useEffect(() => {
    shopCache.set(shop);
  }, [shop]);

  return <LegacyProductsPage />;
}
