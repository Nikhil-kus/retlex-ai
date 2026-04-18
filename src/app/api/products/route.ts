import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const search = searchParams.get('q');

    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const products = await prisma.product.findMany({
      where: {
        shopId,
        ...(search ? {
          OR: [
            { name: { contains: search } },
            { localName: { contains: search } },
            { barcode: { contains: search } }
          ]
        } : {})
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.shopId || !data.name || !data.sellingPrice || !data.unit) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        localName: data.localName || null,
        barcode: data.barcode || null,
        price: parseFloat(data.sellingPrice || 0),
        costPrice: parseFloat(data.costPrice || 0),
        baseUnit: data.unit || "pc",
        baseQuantity: (data.unit === "g" || data.unit === "ml") ? 100 : 1,
        packetWeight: data.packetWeight ? parseFloat(data.packetWeight) : null,
        packetUnit: data.unit === 'pkt' ? data.packetUnit : null,
        category: data.category || null,
        imageUrl: data.imageUrl || null,
        shopId: data.shopId
      }
    });

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
