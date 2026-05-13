import { NextResponse } from 'next/server';
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const { shopId, productIds } = await request.json();

    if (!shopId || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'Shop ID and product IDs array required' }, { status: 400 });
    }

    let deletedCount = 0;
    let forbiddenCount = 0;
    const errors: { productId: string; error: string }[] = [];

    for (const productId of productIds) {
      try {
        // Ownership check — only delete if product belongs to this shop
        const productDoc = await getDoc(doc(db, "products", productId));
        if (!productDoc.exists()) {
          errors.push({ productId, error: 'Not found' });
          continue;
        }
        if (productDoc.data().shopId !== shopId) {
          // Silently skip — do NOT delete products from other shops
          forbiddenCount++;
          errors.push({ productId, error: 'Forbidden: not owned by this shop' });
          continue;
        }
        await deleteDoc(doc(db, "products", productId));
        deletedCount++;
      } catch (error) {
        errors.push({ productId, error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      forbiddenCount,
      totalRequested: productIds.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    return NextResponse.json({ error: 'Failed to delete products' }, { status: 500 });
  }
}
