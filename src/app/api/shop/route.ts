import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const shop = await prisma.shop.findFirst({
      include: { businessType: true }
    });
    return NextResponse.json(shop || null);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch shop' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const existingShop = await prisma.shop.findFirst();
    
    if (existingShop) {
      const updated = await prisma.shop.update({
        where: { id: existingShop.id },
        data: {
          name: data.name,
          mobile: data.mobile,
          address: data.address,
        }
      });
      return NextResponse.json(updated);
    } else {
      // Generate a permanent QR code ID
      const qrCodeId = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      const newShop = await prisma.shop.create({
        data: {
          name: data.name,
          mobile: data.mobile,
          address: data.address,
          qrCodeId
        }
      });
      return NextResponse.json(newShop);
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save shop' }, { status: 500 });
  }
}
