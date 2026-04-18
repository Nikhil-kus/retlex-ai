import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const bill = await prisma.bill.findUnique({
      where: { id: params.id },
      include: { items: true, shop: true }
    });
    if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    return NextResponse.json(bill);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bill' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { status } = await request.json();
    const bill = await prisma.bill.update({
      where: { id: params.id },
      data: { status }
    });
    return NextResponse.json(bill);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 });
  }
}
