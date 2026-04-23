import { NextResponse } from 'next/server';
import { collection, addDoc, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const { shopId, items, businessTypeId } = await request.json();
    
    if (!shopId || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Optional: update the shop's business type if provided
    if (businessTypeId) {
      await updateDoc(doc(db, "shops", shopId), { businessTypeId });
    }

    const createdItems = [];
    for (const item of items) {
      // Check if it already exists
      const q = query(collection(db, "products"), where("shopId", "==", shopId), where("name", "==", item.name));
      const existing = await getDocs(q);

      if (existing.empty) {
        const prodData = {
          shopId,
          name: item.name,
          baseUnit: item.baseUnit,
          baseQuantity: 1, // Default for templates, users can edit later if kirana, but strict 1 for tent house
          price: 0, // Default to 0, owner must update
          costPrice: 0,
        };
        const docRef = await addDoc(collection(db, "products"), prodData);
        createdItems.push({ id: docRef.id, ...prodData });
      }
    }

    return NextResponse.json({ success: true, count: createdItems.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to copy items' }, { status: 500 });
  }
}
