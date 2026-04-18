import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { imageBase64, shopId } = await request.json();
    if (!imageBase64 || !shopId) return NextResponse.json({ error: 'Missing image or shopId' }, { status: 400 });

    const catalog = await prisma.product.findMany({ where: { shopId } });

    // In a real production app, you would send `imageBase64` to an AI model like GPT-4 Vision, 
    // Claude 3 Haiku, or a custom YOLO edge model, and ask it to identify products and their counts.
    // For this MVP, we simulate a practical AI response that returns labels.

    // Simulate AI detecting a few random items from the catalog for demo purposes
    const shuffled = [...catalog].sort(() => 0.5 - Math.random());
    const detectedProducts = shuffled; 

    const detectedItems = detectedProducts.map(product => {
      return {
        productId: product.id,
        name: product.name,
        quantity: 1,
        unit: product.baseUnit || "pc",
        price: product.price || 0,
        costPrice: product.costPrice,
        confidence: 'medium', 
        aiLabel: product.name 
      };
    });

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

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        for (const item of detectedItems) {
           await new Promise(resolve => setTimeout(resolve, 600)); // Simulate AI generating each item dynamically
           controller.enqueue(encoder.encode(JSON.stringify({ item }) + '\n'));
        }
        
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('Vision Analyze Error:', error);
    return NextResponse.json({ error: 'Failed to analyze image' }, { status: 500 });
  }
}
