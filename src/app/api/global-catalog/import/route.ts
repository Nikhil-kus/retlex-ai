/**
 * /api/global-catalog/import
 * ─────────────────────────────────────────────────────────────────────────────
 * Imports selected products from the global catalog into a shop.
 *
 * Built-in IDs are resolved against server presets. Shared product objects
 * are validated and restricted to the target category or universal scope.
 *
 * Each import creates an INDEPENDENT COPY in the target shop's products.
 * Isolation guarantee: editing/deleting the copy never affects the source.
 *
 * POST body: { shopId: string, products: CatalogProduct[] }
 *   (we accept the full product objects from the catalog response to avoid
 *    extra Firestore reads for synthetic IDs)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server';
import { collection, getDoc, doc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getShopType } from '@/lib/shop-types';
import { prepareCatalogImport } from '@/lib/catalog-import';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shopId, products } = body;

    if (typeof shopId !== 'string' || !shopId || !products || !Array.isArray(products) || products.length === 0 || products.length > 2000) {
      return NextResponse.json(
        { error: 'shopId and products array required' },
        { status: 400 }
      );
    }

    // Verify shop exists
    const shopDoc = await getDoc(doc(db, 'shops', shopId));
    if (!shopDoc.exists()) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Validate the entire request before writing any product.
    let prepared;
    try { prepared = products.map(product => prepareCatalogImport(product, getShopType(shopDoc.data()))); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid products' }, { status: 400 }); }

    // Fetch existing shop products to avoid duplicates
    const existingSnap = await getDocs(
      query(collection(db, 'products'), where('shopId', '==', shopId))
    );
    const existingNames = new Set(
      existingSnap.docs.map(d => (d.data().name || '').toLowerCase().trim())
    );

    let imported = 0;
    let skipped = 0;
    let batch = writeBatch(db);
    let pending = 0;

    for (const product of prepared) {
      const nameLower = (product.name || '').toLowerCase().trim();
      if (!nameLower) { skipped++; continue; }

      // Skip if already exists in this shop
      if (existingNames.has(nameLower)) { skipped++; continue; }

      batch.set(doc(collection(db, 'products')), {
        ...product,
        shopId,  // bind to the importing shop — fully independent copy
      });
      pending++;
      if (pending === 400) { await batch.commit(); batch = writeBatch(db); pending = 0; }

      existingNames.add(nameLower);
      imported++;
    }
    if (pending) await batch.commit();

    return NextResponse.json({ success: true, imported, skipped, total: products.length });
  } catch (error) {
    console.error('Global catalog import error:', error);
    return NextResponse.json({ error: 'Failed to import products' }, { status: 500 });
  }
}
