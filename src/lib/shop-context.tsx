'use client';

/**
 * src/lib/shop-context.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-tenant Shop Context.
 *
 * Architecture:
 *   - Shop identity comes from the URL: /[shopId]/billing, /[shopId]/products
 *   - This context reads the shopId from the URL params (passed by the layout)
 *     and fetches the shop document from Firestore once per session.
 *   - All child pages call `useShop()` to get the current shop — no more
 *     individual `fetch('/api/shop')` calls scattered across every page.
 *
 * Multi-tenant isolation:
 *   - Each shop's data is scoped to its shopId.
 *   - No global env var needed — the URL IS the shop identity.
 *   - When auth is added, the server layout will validate that the
 *     authenticated user owns the shopId before rendering.
 *
 * Caching:
 *   - Shop data is cached in sessionStorage keyed by shopId.
 *   - Catalog (products) is cached in sessionStorage keyed by shopId.
 *   - Cache is cleared when the shopId changes (different shop).
 *
 * Auth-ready:
 *   - Add `ownerId` check here when Firebase Auth is integrated.
 *   - The context shape won't change — pages won't need updating.
 *
 * Usage:
 *   // In any page under /[shopId]/...
 *   const { shop, shopId, loading } = useShop();
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, ReactNode
} from 'react';
import { Shop } from '@/types';
import { shopCache, catalogCache } from '@/lib/session-cache';

interface ShopContextValue {
  /** The current shop document, or null while loading / not found */
  shop: Shop | null;
  /** The shopId from the URL */
  shopId: string;
  /** True while the initial shop fetch is in progress */
  loading: boolean;
  /** Non-null if the shop fetch failed or shop was not found */
  error: string | null;
  /** Force-refresh the shop data (clears cache) */
  refreshShop: () => Promise<void>;
}

const ShopContext = createContext<ShopContextValue>({
  shop: null,
  shopId: '',
  loading: true,
  error: null,
  refreshShop: async () => {},
});

interface ShopProviderProps {
  shopId: string;
  children: ReactNode;
}

export function ShopProvider({ shopId, children }: ShopProviderProps) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShop = useCallback(async (bustCache = false) => {
    if (!shopId) {
      setError('No shop ID provided');
      setLoading(false);
      return;
    }

    // Try session cache first (skip if busting)
    if (!bustCache) {
      const cached = shopCache.get();
      if (cached && cached.id === shopId && !cached.error) {
        setShop(cached as Shop);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/shops/${shopId}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Shop not found');
        setShop(null);
        setLoading(false);
        return;
      }
      const data: Shop = await res.json();
      shopCache.set(data);

      // Persist last-used shopId to localStorage for redirect logic
      try {
        localStorage.setItem('lastShopId', shopId);
      } catch {}

      // The GET route backfills qrCodeId in Firestore AND returns the updated
      // value in the same response, so a second fetch is not needed.
      setShop(data);
    } catch (e) {
      setError('Failed to load shop data');
      setShop(null);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  // Fetch on mount and when shopId changes
  useEffect(() => {
    // Clear catalog cache if shopId changed
    const cached = shopCache.get();
    if (cached && cached.id !== shopId) {
      shopCache.clear();
      catalogCache.clear();
    }
    fetchShop();
  }, [shopId, fetchShop]);

  const refreshShop = useCallback(async () => {
    shopCache.clear();
    await fetchShop(true);
  }, [fetchShop]);

  return (
    <ShopContext.Provider value={{ shop, shopId, loading, error, refreshShop }}>
      {children}
    </ShopContext.Provider>
  );
}

/**
 * useShop — access the current shop context.
 *
 * Must be used inside a component rendered under ShopProvider
 * (i.e., inside the /[shopId]/ layout).
 */
export function useShop(): ShopContextValue {
  return useContext(ShopContext);
}
