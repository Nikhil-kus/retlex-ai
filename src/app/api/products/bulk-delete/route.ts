import { NextResponse } from 'next/server';
import { collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const { shopId, productIds } = await request.json();

    if (!shopId || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'Shop ID and product IDs array required' }, { status: 400 });
    }

    let deletedCount = 0;
    const errors = [];

    for (const productId of productIds) {
      try {
        await deleteDoc(doc(db, "products", productId));
        deletedCount++;
      } catch (error) {
        errors.push({ productId, error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      totalRequested: productIds.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    return NextResponse.json({ error: 'Failed to delete products' }, { status: 500 });
  }
}
