import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json();
    const product = await prisma.product.update({
      where: { id: params.id },
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
      }
    });

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.product.delete({
      where: { id: params.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
