import { NextResponse } from 'next/server';
import { collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    // SECURITY: shopId is required — never scan the entire products collection
    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId query parameter is required' },
        { status: 400 }
      );
    }

    // Scoped to this shop only
    const q = query(collection(db, "products"), where("shopId", "==", shopId));
    const querySnapshot = await getDocs(q);
    const updates = [];

    for (const document of querySnapshot.docs) {
      const data = document.data();
      // Using Bing Thumbnail API to dynamically fetch real-world product images!
      const nameLower = data.name ? data.name.toLowerCase() : '';
      const localName = data.localName ? data.localName.toLowerCase() : '';
      const isLoose = nameLower.includes('loose') || nameLower.includes('khula') || localName.includes('खुला') || (data.unit === 'kg' && !nameLower.match(/5kg|10kg|1kg/));
      
      let searchQuery = data.name + " grocery product india";
      if (isLoose) {
        const baseName = data.name.replace(/loose|khula/ig, '').trim();
        searchQuery = "heap of " + baseName + " isolated on white background without packet";
      }

      const encodedName = encodeURIComponent(searchQuery);
      const newImageUrl = `https://tse1.mm.bing.net/th?q=${encodedName}`;
      
      updates.push(updateDoc(doc(db, "products", document.id), {
        imageUrl: newImageUrl
      }));
    }

    await Promise.all(updates);

    return NextResponse.json({ success: true, updatedCount: updates.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fix product images' }, { status: 500 });
  }
}
