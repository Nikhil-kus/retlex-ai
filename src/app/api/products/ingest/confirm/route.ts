/**
 * POST /api/products/ingest/confirm
 * ─────────────────────────────────────────────────────────────────────────────
 * Saves reviewed + confirmed products to:
 *   1. `products` collection (shopId-scoped)
 *   2. `globalCatalog` collection (shared, if not already present)
 *
 * Body: { shopId, products: ConfirmedProduct[] }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server';
import {
  collection, addDoc, getDocs, query, where,
  doc, setDoc, getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ConfirmedProduct {
  name: string;
  localName?: string;
  brand?: string;
  variant?: string;
  category?: string;
  price?: number;
  costPrice?: number;
  baseUnit?: string;
  baseQuantity?: number;
  imageUrl?: string;
  globalCatalogId?: string;
}

export async function POST(request: Request) {
  try {
    const { shopId, products } = await request.json();

    if (!shopId || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'Missing shopId or products' }, { status: 400 });
    }

    // Fetch existing shop product names to prevent duplicates
    const existingSnap = await getDocs(
      query(collection(db, 'products'), where('shopId', '==', shopId))
    );
    const existingNames = new Set(
      existingSnap.docs.map(d => ((d.data() as any).name || '').toLowerCase().trim())
    );

    const saved: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const product of products as ConfirmedProduct[]) {
      const name = (product.name || '').trim();
      if (!name) continue;

      const nameKey = name.toLowerCase();

      // Skip duplicates
      if (existingNames.has(nameKey)) {
        skipped.push(name);
        continue;
      }

      try {
        const baseUnit = product.baseUnit || 'pc';
        const isWeight = ['g', 'ml'].includes(baseUnit);

        const productDoc = {
          name,
          localName: product.localName || null,
          brand: product.brand || null,
          variant: product.variant || null,
          category: product.category || 'Other',
          price: Number(product.price) || 0,
          costPrice: Number(product.costPrice) || 0,
          baseUnit,
          baseQuantity: product.baseQuantity ?? (isWeight ? 100 : 1),
          packetWeight: null,
          packetUnit: null,
          imageUrl: product.imageUrl || null,
          shopId,
          createdAt: new Date().toISOString(),
          source: 'image_ingest',
        };

        // Save to shop products
        const docRef = await addDoc(collection(db, 'products'), productDoc);
        saved.push(name);
        existingNames.add(nameKey); // prevent duplicates within same batch

        // ── Upsert to globalCatalog ──────────────────────────────────────────
        // Use provided globalCatalogId or derive a stable ID from the name
        const globalId = product.globalCatalogId ||
          `gc_${nameKey.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 60)}`;

        const globalRef = doc(db, 'globalCatalog', globalId);
        const globalSnap = await getDoc(globalRef);

        if (!globalSnap.exists()) {
          // New global entry
          await setDoc(globalRef, {
            name,
            localName: product.localName || null,
            brand: product.brand || null,
            category: product.category || 'Other',
            baseUnit,
            baseQuantity: productDoc.baseQuantity,
            price: productDoc.price,
            imageUrl: product.imageUrl || null,
            createdAt: new Date().toISOString(),
            sourceShopId: shopId,
            sourceProductId: docRef.id,
          });
        } else {
          // Existing entry — only update image if we have one and it doesn't
          const existing = globalSnap.data();
          if (!existing.imageUrl && product.imageUrl) {
            await setDoc(globalRef, { imageUrl: product.imageUrl }, { merge: true });
          }
        }

      } catch (err: any) {
        console.error(`Failed to save product "${name}":`, err);
        errors.push(name);
      }
    }

    return NextResponse.json({
      success: true,
      saved: saved.length,
      skipped: skipped.length,
      errors: errors.length,
      savedNames: saved,
      skippedNames: skipped,
      errorNames: errors,
    });

  } catch (error: any) {
    console.error('Ingest confirm error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save products' }, { status: 500 });
  }
}
