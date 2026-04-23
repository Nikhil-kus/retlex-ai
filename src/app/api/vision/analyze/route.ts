import { NextResponse } from 'next/server';
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const { imageBase64, shopId } = await request.json();
    if (!imageBase64 || !shopId) return NextResponse.json({ error: 'Missing image or shopId' }, { status: 400 });

    const q = query(collection(db, "products"), where("shopId", "==", shopId));
    const querySnapshot = await getDocs(q);
    const catalog = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);

    // In a real production app, you would send `imageBase64` to an AI model like GPT-4 Vision, 
    // Claude 3 Haiku, or a custom YOLO edge model, and ask it to identify products and their counts.
    // For this MVP, we simulate a practical AI response that returns labels.

    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API latency

    // Simulate AI detecting a few random items from the catalog for demo purposes
    // We'll pick 2-3 random items from the existing catalog to show the review UI workflow correctly.
    const shuffled = [...catalog].sort(() => 0.5 - Math.random());
    const detectedProducts = shuffled; // 2 to 3 items 

    const detectedItems = detectedProducts.map(product => {
      // Simulate that the AI found the object and we matched it to the catalog
      return {
        productId: product.id,
        name: product.name,
        quantity: 1,
        unit: product.baseUnit || "pc",
        price: product.price || 0,
        costPrice: product.costPrice,
        confidence: 'medium', // Require review
        aiLabel: product.name // The raw label the AI returned
      };
    });

    // Add one unmatched item to show the fallback UI
    detectedItems.push({
      productId: null as any,
      name: "Unrecognized Blue Packet",
      quantity: 1,
      unit: "pc",
      price: 0,
      costPrice: 0,
      confidence: "low",
      aiLabel: "Unknown Object"
    });

    return NextResponse.json({
      success: true,
      items: detectedItems
    });

  } catch (error) {
    console.error('Vision Analyze Error:', error);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}
