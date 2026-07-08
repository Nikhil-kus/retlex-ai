/**
 * POST /api/shops/[shopId]/logo
 * ─────────────────────────────────────────────────────────────────────────────
 * Receives a base64-encoded image, stores it directly in the shop's Firestore
 * document as a data URL.
 *
 * Why not Firebase Storage?
 *   Storage requires auth rules. Storing a small compressed logo (≤ 80 KB)
 *   inline in Firestore avoids that dependency entirely and matches the
 *   pattern used for product images elsewhere in this project.
 *
 * DELETE /api/shops/[shopId]/logo — clears the logoUrl field
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Params = { params: Promise<{ shopId: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { shopId } = await params;
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const { imageBase64 } = await request.json();
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });
    }

    // Validate it's a data URL with an image MIME type
    if (!imageBase64.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }

    // Rough size check — base64 of a 300 KB file is ~400 KB string
    if (imageBase64.length > 500_000) {
      return NextResponse.json(
        { error: 'Image too large. Please compress it below 300 KB before uploading.' },
        { status: 413 }
      );
    }

    const shopDoc = await getDoc(doc(db, 'shops', shopId));
    if (!shopDoc.exists()) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    await updateDoc(doc(db, 'shops', shopId), { logoUrl: imageBase64 });

    return NextResponse.json({ logoUrl: imageBase64 });
  } catch (error: any) {
    console.error('POST /api/shops/[shopId]/logo error:', error);
    const msg =
      error?.code === 'permission-denied'
        ? 'Firestore Permission Denied. Check your Firebase security rules.'
        : 'Failed to save logo';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { shopId } = await params;
    if (!shopId) {
      return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });
    }

    const shopDoc = await getDoc(doc(db, 'shops', shopId));
    if (!shopDoc.exists()) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    await updateDoc(doc(db, 'shops', shopId), { logoUrl: null });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/shops/[shopId]/logo error:', error);
    return NextResponse.json({ error: 'Failed to remove logo' }, { status: 500 });
  }
}
