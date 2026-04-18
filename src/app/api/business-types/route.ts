import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const businessTypes = await prisma.businessType.findMany({
      include: { items: true },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(businessTypes);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch business types' }, { status: 500 });
  }
}
