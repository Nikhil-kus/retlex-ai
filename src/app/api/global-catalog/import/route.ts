/**
 * /api/global-catalog/import
 * ─────────────────────────────────────────────────────────────────────────────
 * Architecture note:
 *   This endpoint allows new shops to import products from the globalCatalog.
 *   Each import creates an INDEPENDENT COPY inside the shop's products collection.
 *
 *   Isolation guarantee:
 *     - Editing a shop product does NOT affect globalCatalog.
 *     - Deleting a shop product does NOT affect globalCatalog.
 *     - Editing globalCatalog does NOT affect existing shop products.
 *
 * POST — import selected products from globalCatalog into a shop
 *   Body: { shopId: string, productIds: string[] }
 *   Returns: { success: true, count: number }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server';
import { collection, addDoc, getDoc, doc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const { shopId, productIds } = await request.json();

    if (!shopId || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'shopId and productIds array required' },
        { status: 400 }
      );
    }

    // Verify shop exists
    const shopDoc = await getDoc(doc(db, "shops", shopId));
    if (!shopDoc.exists()) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Fetch existing shop products to avoid duplicates
    const existingSnap = await getDocs(
      query(collection(db, "products"), where("shopId", "==", shopId))
    );
    const existingNames = new Set(
      existingSnap.docs.map(d => (d.data().name || "").toLowerCase().trim())
    );

    let imported = 0;
    let skipped = 0;

    for (const productId of productIds) {
      // Fetch from globalCatalog
      const catalogDoc = await getDoc(doc(db, "globalCatalog", productId));
      if (!catalogDoc.exists()) {
        skipped++;
        continue;
      }

      const catalogData = catalogDoc.data();
      const nameLower = (catalogData.name || "").toLowerCase().trim();

      // Skip if already exists in shop
      if (existingNames.has(nameLower)) {
        skipped++;
        continue;
      }

      // Create independent copy in shop's products
      const { id: _id, sourceShopId: _src, createdAt: _c, updatedAt: _u, ...productData } = catalogData;

      await addDoc(collection(db, "products"), {
        ...productData,
        shopId,  // bind to this shop
        // No reference to globalCatalog — fully independent
      });

      existingNames.add(nameLower); // prevent duplicates within this batch
      imported++;
    }

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: productIds.length,
    });
  } catch (error) {
    console.error('Global catalog import error:', error);
    return NextResponse.json({ error: 'Failed to import products' }, { status: 500 });
  }
}
