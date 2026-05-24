/**
 * /api/products/kirana-import
 * ─────────────────────────────────────────────────────────────────────────────
 * Imports the hardcoded KIRANA_PRODUCTS catalog into a shop.
 * Each product becomes an independent copy in the shop's products collection.
 *
 * Field schema is normalized to match the main products route:
 *   price, costPrice, baseUnit, baseQuantity, packetWeight, packetUnit,
 *   name, localName, imageUrl, category, barcode, shopId
 *
 * POST — { shopId: string }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server';
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { KIRANA_PRODUCTS } from "@/lib/kirana-catalog";

export async function POST(req: Request) {
  try {
    const { shopId } = await req.json();

    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID is required' }, { status: 400 });
    }

    // Fetch existing products to avoid duplicates
    const existingSnap = await getDocs(
      query(collection(db, "products"), where("shopId", "==", shopId))
    );
    const existingNames = new Set(
      existingSnap.docs.map(d => (d.data().name || "").toLowerCase().trim())
    );

    const productsRef = collection(db, "products");
    let imported = 0;
    let skipped = 0;

    for (const product of KIRANA_PRODUCTS) {
      const nameLower = (product.name || "").toLowerCase().trim();
      if (existingNames.has(nameLower)) { skipped++; continue; }

      // Normalized schema — matches the main POST /api/products route exactly
      await addDoc(productsRef, {
        shopId,
        name: product.name,
        localName: product.localName || null,
        localAliases: product.aliases || null,
        barcode: null,
        price: product.price || 0,
        costPrice: 0,                          // owner sets cost price later
        baseUnit: product.unit || "pc",
        baseQuantity: product.baseQuantity || 1,
        packetWeight: null,
        packetUnit: null,
        category: null,                        // owner categorizes later
        imageUrl: product.imageUrl || null,
      });

      existingNames.add(nameLower);
      imported++;
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${imported} kirana products (${skipped} already existed)`,
      count: imported,
      skipped,
    });
  } catch (error) {
    console.error('Kirana import error:', error);
    return NextResponse.json({ error: 'Failed to import kirana catalog' }, { status: 500 });
  }
}
