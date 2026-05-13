'use client';

/**
 * src/lib/use-shop-data.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable hooks for fetching shop-scoped data.
 *
 * These hooks replace the scattered `fetch('/api/shop')` + `fetch('/api/products?shopId=...')`
 * patterns in every page. They use the ShopContext for the shopId and
 * sessionStorage for caching.
 *
 * Usage:
 *   const { catalog, loading, refresh } = useCatalog();
 *   const { bills, loading } = useBills();
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from 'react';
import { useShop } from '@/lib/shop-context';
import { catalogCache } from '@/lib/session-cache';
import type { Product, Bill } from '@/types';

// ── useCatalog ────────────────────────────────────────────────────────────────

interface UseCatalogResult {
  catalog: Product[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCatalog(): UseCatalogResult {
  const { shopId } = useShop();
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = useCallback(async (bustCache = false) => {
    if (!shopId) return;

    if (!bustCache) {
      const cached = catalogCache.get(shopId);
      if (cached) {
        setCatalog(cached as Product[]);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products?shopId=${shopId}`);
      if (!res.ok) throw new Error('Failed to fetch catalog');
      const data: Product[] = await res.json();
      catalogCache.set(shopId, data);
      setCatalog(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const refresh = useCallback(async () => {
    catalogCache.clear();
    await fetchCatalog(true);
  }, [fetchCatalog]);

  return { catalog, loading, error, refresh };
}

// ── useBills ──────────────────────────────────────────────────────────────────

interface UseBillsResult {
  bills: Bill[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBills(): UseBillsResult {
  const { shopId } = useShop();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBills = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bills?shopId=${shopId}`);
      if (!res.ok) throw new Error('Failed to fetch bills');
      const data: Bill[] = await res.json();
      setBills(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  return { bills, loading, error, refresh: fetchBills };
}
