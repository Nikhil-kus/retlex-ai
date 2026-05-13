/**
 * /[shopId]/customer
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-tenant customer ordering page.
 *
 * Strategy: fetch the correct shop via /api/shops/[shopId], seed the
 * shopCache, then render the existing CustomerPage which reads from that cache.
 * This avoids duplicating the 1000-line customer page.
 * ─────────────────────────────────────────────────────────────────────────────
 */
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { shopCache } from '@/lib/session-cache';
import CustomerPage from '@/app/customer/page';

export default function ShopCustomerPage() {
  const params = useParams();
  const shopId = params?.shopId as string;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!shopId) return;

    const cached = shopCache.get();
    // If cache already has this shop, render immediately
    if (cached && cached.id === shopId && !cached.error) {
      setReady(true);
      return;
    }

    // Fetch the correct shop and seed the cache before rendering CustomerPage
    fetch(`/api/shops/${shopId}`)
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          shopCache.set(data);
        }
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [shopId]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-slate-400 text-sm animate-pulse">Loading shop…</div>
      </div>
    );
  }

  return <CustomerPage />;
}
