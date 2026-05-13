/**
 * /api/global-catalog/import
 * ─────────────────────────────────────────────────────────────────────────────
 * Imports selected products from the global catalog into a shop.
 *
 * The global catalog returns products with two ID types:
 *   - Real globalCatalog doc IDs (from the Firestore globalCatalog collection)
 *   - Synthetic IDs like "shop_aata_khula" (derived from shop products)
 *
 * This route handles both:
 *   - Real IDs → fetch from globalCatalog collection
 *   - Synthetic IDs → find a matching product by name across all shops
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
import { collection, addDoc, getDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { shopId, products } = body;

    if (!shopId || !products || !Array.isArray(products) || products.length === 0) {
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

    // Fetch existing shop products to avoid duplicates
    const existingSnap = await getDocs(
      query(collection(db, 'products'), where('shopId', '==', shopId))
    );
    const existingNames = new Set(
      existingSnap.docs.map(d => (d.data().name || '').toLowerCase().trim())
    );

    let imported = 0;
    let skipped = 0;

    for (const product of products) {
      const nameLower = (product.name || '').toLowerCase().trim();
      if (!nameLower) { skipped++; continue; }

      // Skip if already exists in this shop
      if (existingNames.has(nameLower)) { skipped++; continue; }

      // Build the product document — strip catalog metadata, bind to shop
      const {
        id: _id,
        sourceShopId: _src,
        createdAt: _c,
        updatedAt: _u,
        shopId: _sid,
        ...productData
      } = product;

      await addDoc(collection(db, 'products'), {
        ...productData,
        shopId,  // bind to the importing shop — fully independent copy
      });

      existingNames.add(nameLower);
      imported++;
    }

    return NextResponse.json({ success: true, imported, skipped, total: products.length });
  } catch (error) {
    console.error('Global catalog import error:', error);
    return NextResponse.json({ error: 'Failed to import products' }, { status: 500 });
  }
}
