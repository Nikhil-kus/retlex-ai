import { NextResponse } from 'next/server';
import { SHOP_TYPES } from '@/lib/shop-types';
import { STARTER_CATALOG } from '@/lib/starter-catalog';

export async function GET() {
  return NextResponse.json(SHOP_TYPES.map(type => ({ ...type, items: STARTER_CATALOG.filter(p => p.shopType === type.id || p.shopType === 'universal') })));
}
