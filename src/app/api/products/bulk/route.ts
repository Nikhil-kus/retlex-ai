import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { shopId, items, businessTypeId } = await request.json();
    
    if (!shopId || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Optional: update the shop's business type if provided
    if (businessTypeId) {
      await prisma.shop.update({
        where: { id: shopId },
        data: { businessTypeId }
      });
    }

    const createdItems = [];
    for (const item of items) {
      // Check if it already exists
      const existing = await prisma.product.findFirst({
        where: { shopId, name: item.name }
      });

      if (!existing) {
        const prod = await prisma.product.create({
          data: {
            shopId,
            name: item.name,
            baseUnit: item.baseUnit,
            baseQuantity: 1, // Default for templates, users can edit later if kirana, but strict 1 for tent house
            price: 0, // Default to 0, owner must update
            costPrice: 0,
          }
        });
        createdItems.push(prod);
      }
    }

    return NextResponse.json({ success: true, count: createdItems.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to copy items' }, { status: 500 });
  }
}
