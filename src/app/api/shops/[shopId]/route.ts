/**
 * /api/shops/[shopId]
 * ─────────────────────────────────────────────────────────────────────────────
 * Per-shop REST endpoint. This is the multi-tenant replacement for /api/shop.
 *
 * Architecture:
 *   - shopId comes from the URL, not from env or a global singleton.
 *   - Each shop is a separate Firestore document — O(1) lookup.
 *   - When auth is added, add a check here: verify the authenticated user
 *     owns this shopId before returning data.
 *
 * GET  /api/shops/[shopId]        — fetch shop by ID
 * PUT  /api/shops/[shopId]        — update shop (name, mobile, address)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Shop } from '@/types';

function generateQrCodeId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

type Params = { params: Promise<{ shopId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { shopId } = await params;
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const shopDoc = await getDoc(doc(db, 'shops', shopId));
    if (!shopDoc.exists()) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const data = shopDoc.data() as Omit<Shop, 'id'>;

    // Backfill qrCodeId if missing — happens for shops created before this field existed
    if (!data.qrCodeId) {
      const qrCodeId = generateQrCodeId();
      await updateDoc(doc(db, 'shops', shopId), { qrCodeId });
      data.qrCodeId = qrCodeId;
    }

    const shop: Shop = { id: shopDoc.id, ...data };
    return NextResponse.json(shop);
  } catch (error) {
    console.error('GET /api/shops/[shopId] error:', error);
    return NextResponse.json({ error: 'Failed to fetch shop' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { shopId } = await params;
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const data = await request.json();

    // TODO: When auth is added, verify request.user.uid owns this shopId

    const shopDoc = await getDoc(doc(db, 'shops', shopId));
    if (!shopDoc.exists()) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const existing = shopDoc.data() as Omit<Shop, 'id'>;

    // Backfill qrCodeId if the shop was created before this field was introduced
    const qrCodeId =
      existing.qrCodeId ||
      Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

    const updateData = {
      name: data.name,
      mobile: data.mobile,
      address: data.address,
      qrCodeId,
    };

    await updateDoc(doc(db, 'shops', shopId), updateData);
    const updated: Shop = { id: shopId, ...existing, ...updateData };
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/shops/[shopId] error:', error);
    return NextResponse.json({ error: 'Failed to update shop' }, { status: 500 });
  }
}
