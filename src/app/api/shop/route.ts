/**
 * /api/shop
 * ─────────────────────────────────────────────────────────────────────────────
 * Architecture note:
 *   The active shop is pinned via ACTIVE_SHOP_ID in .env.
 *   This prevents the old bug where GET returned docs[0] — the first shop
 *   alphabetically — which was non-deterministic when two shops existed.
 *
 *   After running `node scripts/db-migrate.mjs`, ACTIVE_SHOP_ID is written
 *   automatically. For new deployments, set it manually in .env.
 *
 * GET  — returns the active shop document
 * POST — updates the active shop (name, mobile, address)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server';
import {
  collection, addDoc, getDocs, getDoc,
  doc, updateDoc, query, where
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/** Returns the pinned shop ID from env, or null if not set. */
function getActiveShopId(): string | null {
  return process.env.ACTIVE_SHOP_ID || null;
}

export async function GET() {
  try {
    const activeShopId = getActiveShopId();

    if (activeShopId) {
      // Fast path: direct document lookup — O(1), no collection scan
      const shopDoc = await getDoc(doc(db, "shops", activeShopId));
      if (shopDoc.exists()) {
        const shop = { id: shopDoc.id, ...shopDoc.data() };
        return NextResponse.json(shop);
      }
      // If the pinned ID no longer exists, fall through to collection scan
      console.warn(`ACTIVE_SHOP_ID "${activeShopId}" not found in Firestore — falling back to collection scan.`);
    }

    // Fallback: scan collection (handles first-run before migration)
    const querySnapshot = await getDocs(collection(db, "shops"));
    if (querySnapshot.empty) return NextResponse.json(null);

    const shopDoc = querySnapshot.docs[0];
    const shop = { id: shopDoc.id, ...shopDoc.data() };
    return NextResponse.json(shop);
  } catch (error: any) {
    console.error("GET /api/shop error:", error);
    const msg = error?.code === 'permission-denied'
      ? 'Firestore Permission Denied. Check your Firebase security rules.'
      : 'Failed to fetch shop';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const activeShopId = getActiveShopId();

    if (activeShopId) {
      // Update the pinned shop
      const shopDoc = await getDoc(doc(db, "shops", activeShopId));
      if (shopDoc.exists()) {
        const existing = shopDoc.data() as any;
        // Backfill qrCodeId if missing (shops created before this field was introduced)
        const qrCodeId = existing.qrCodeId || (Math.random().toString(36).substring(2, 10) + Date.now().toString(36));
        const updateData: any = {
          name: data.name,
          mobile: data.mobile,
          address: data.address,
          qrCodeId,
        };
        await updateDoc(doc(db, "shops", activeShopId), updateData);
        return NextResponse.json({ id: activeShopId, ...existing, ...updateData });
      }
    }

    // Fallback: check if any shop exists
    const querySnapshot = await getDocs(collection(db, "shops"));

    if (!querySnapshot.empty) {
      const existingDoc = querySnapshot.docs[0];
      const existing = existingDoc.data() as any;
      const qrCodeId = existing.qrCodeId || (Math.random().toString(36).substring(2, 10) + Date.now().toString(36));
      const updateData = { name: data.name, mobile: data.mobile, address: data.address, qrCodeId };
      await updateDoc(doc(db, "shops", existingDoc.id), updateData);
      return NextResponse.json({ id: existingDoc.id, ...existing, ...updateData });
    }

    // Create new shop (first-time setup)
    const qrCodeId = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const newShop = {
      name: data.name,
      mobile: data.mobile,
      address: data.address,
      qrCodeId,
    };
    const docRef = await addDoc(collection(db, "shops"), newShop);
    return NextResponse.json({ id: docRef.id, ...newShop });
  } catch (error: any) {
    console.error("POST /api/shop error:", error);
    const msg = error?.code === 'permission-denied'
      ? 'Firestore Permission Denied. Check your Firebase security rules.'
      : 'Failed to save shop';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
