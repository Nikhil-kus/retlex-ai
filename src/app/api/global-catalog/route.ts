/**
 * /api/global-catalog
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns a deduplicated, merged product catalog built from:
 *   1. The `globalCatalog` Firestore collection (seeded via db-migrate.mjs)
 *   2. All products across all shops (live, always up-to-date)
 *
 * Deduplication rule: products with the same name (case-insensitive, trimmed)
 * are merged — the one with the most complete data (imageUrl, localName, etc.)
 * wins. The `id` returned is the globalCatalog doc ID if it exists, otherwise
 * a synthetic ID derived from the product name for stable selection.
 *
 * This means:
 *   - When any shop adds a new product, it appears here automatically.
 *   - No manual seeding needed after the initial migration.
 *   - Deleting a product from a shop does NOT remove it from the catalog
 *     (other shops may still have it, or it may be in globalCatalog).
 *
 * GET /api/global-catalog
 *   Returns: Product[] sorted by category then name, deduplicated
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    // Fetch globalCatalog and all shop products in parallel
    const [globalSnap, productsSnap] = await Promise.all([
      getDocs(collection(db, 'globalCatalog')),
      getDocs(collection(db, 'products')),
    ]);

    // Map: normalizedName → best product entry
    const catalog = new Map<string, any>();

    // Helper: score a product entry by data completeness
    // Higher = more complete = preferred when deduplicating
    const score = (p: any) =>
      (p.imageUrl ? 4 : 0) +
      (p.localName ? 2 : 0) +
      (p.category ? 1 : 0) +
      (p.price > 0 ? 1 : 0);

    // 1. Seed from globalCatalog first (these have stable IDs)
    for (const d of globalSnap.docs) {
      const data = d.data();
      const key = (data.name || '').toLowerCase().trim();
      if (!key) continue;
      catalog.set(key, {
        id: d.id,           // stable globalCatalog doc ID
        _source: 'global',
        ...data,
      });
    }

    // 2. Merge in all shop products — deduplicate by name
    for (const d of productsSnap.docs) {
      const data = d.data();
      const key = (data.name || '').toLowerCase().trim();
      if (!key) continue;

      const existing = catalog.get(key);
      if (!existing) {
        // New product not in globalCatalog — add it with a synthetic stable ID
        catalog.set(key, {
          id: `shop_${key.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`,
          _source: 'shop',
          _shopProductId: d.id,  // reference to one real product doc
          ...data,
          // Strip shopId — this is a catalog entry, not a shop-specific product
          shopId: undefined,
        });
      } else {
        // Already exists — keep the more complete entry
        if (score(data) > score(existing)) {
          catalog.set(key, {
            ...existing,          // keep the stable ID
            ...data,
            id: existing.id,      // never overwrite the stable ID
            shopId: undefined,    // strip shopId
            _source: existing._source,
          });
        }
      }
    }

    // Convert to array, sort by category then name
    const items = Array.from(catalog.values())
      .map(({ _source, _shopProductId, shopId, sourceShopId, createdAt, updatedAt, ...rest }) => rest)
      .sort((a, b) => {
        const catA = (a.category || 'Uncategorized').toLowerCase();
        const catB = (b.category || 'Uncategorized').toLowerCase();
        if (catA !== catB) return catA.localeCompare(catB);
        return (a.name || '').localeCompare(b.name || '');
      });

    return NextResponse.json(items);
  } catch (error) {
    console.error('GET /api/global-catalog error:', error);
    return NextResponse.json({ error: 'Failed to fetch global catalog' }, { status: 500 });
  }
}
