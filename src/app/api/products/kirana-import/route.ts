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

    // Check if shop exists
    const shopsRef = collection(db, "shops");
    const shopQuery = query(shopsRef, where("__name__", "==", shopId));
    const shopSnapshot = await getDocs(shopQuery);

    if (shopSnapshot.empty) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Add all kirana products to the shop
    const productsRef = collection(db, "products");
    const addedProducts = [];

    for (const product of KIRANA_PRODUCTS) {
      const docRef = await addDoc(productsRef, {
        shopId,
        name: product.name,
        localName: product.localName,
        aliases: product.aliases,
        unit: product.unit,
        baseQuantity: product.baseQuantity,
        price: product.price,
        quantity: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      addedProducts.push({
        id: docRef.id,
        ...product
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${addedProducts.length} kirana products`,
      count: addedProducts.length
    });
  } catch (error) {
    console.error('Error importing kirana catalog:', error);
    return NextResponse.json({ error: 'Failed to import kirana catalog' }, { status: 500 });
  }
}
