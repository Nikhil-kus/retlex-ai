/**
 * /api/shops
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-tenant shops collection endpoint.
 *
 * GET  — list all shops (for the shop picker / onboarding screen)
 * POST — create a new shop
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server';
import { collection, addDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Shop } from '@/types';
import { isShopType, shopTypeName } from '@/lib/shop-types';

export async function GET() {
  try {
    const snap = await getDocs(query(collection(db, 'shops'), orderBy('name', 'asc')));
    const shops: Shop[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Shop, 'id'>) }));
    return NextResponse.json(shops);
  } catch (error: any) {
    // Fallback without orderBy if index not ready
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
      try {
        const snap = await getDocs(collection(db, 'shops'));
        const shops: Shop[] = snap.docs
          .map(d => ({ id: d.id, ...(d.data() as Omit<Shop, 'id'>) }))
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        return NextResponse.json(shops);
      } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch shops' }, { status: 500 });
      }
    }
    console.error('GET /api/shops error:', error);
    return NextResponse.json({ error: 'Failed to fetch shops' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();

    if (typeof data.name !== 'string' || !data.name.trim() || typeof data.mobile !== 'string' || !data.mobile.trim()) {
      return NextResponse.json({ error: 'Name and mobile are required' }, { status: 400 });
    }

    if (!isShopType(data.shopType)) {
      return NextResponse.json({ error: 'Choose Kirana, Tent House or Electronics.' }, { status: 400 });
    }
    if (data.address !== undefined && typeof data.address !== 'string') {
      return NextResponse.json({ error: 'Address must be text' }, { status: 400 });
    }

    // Generate a permanent QR code ID for the customer-facing bill page
    const qrCodeId =
      Math.random().toString(36).substring(2, 10) +
      Date.now().toString(36);

    const newShop = {
      name: data.name.trim(),
      mobile: data.mobile.trim(),
      address: (data.address || '').trim(),
      shopType: data.shopType,
      businessType: { name: shopTypeName(data.shopType) },
      catalogSetupComplete: false,
      qrCodeId,
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'shops'), newShop);
    const shop: Shop = { id: docRef.id, ...newShop };
    return NextResponse.json(shop, { status: 201 });
  } catch (error) {
    console.error('POST /api/shops error:', error);
    return NextResponse.json({ error: 'Failed to create shop' }, { status: 500 });
  }
}
