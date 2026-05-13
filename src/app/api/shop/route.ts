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
  } catch (error) {
    console.error("GET /api/shop error:", error);
    return NextResponse.json({ error: 'Failed to fetch shop' }, { status: 500 });
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
        const updateData = {
          name: data.name,
          mobile: data.mobile,
          address: data.address,
        };
        await updateDoc(doc(db, "shops", activeShopId), updateData);
        return NextResponse.json({ id: activeShopId, ...shopDoc.data(), ...updateData });
      }
    }

    // Fallback: check if any shop exists
    const querySnapshot = await getDocs(collection(db, "shops"));

    if (!querySnapshot.empty) {
      const existingShop = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      const updateData = { name: data.name, mobile: data.mobile, address: data.address };
      await updateDoc(doc(db, "shops", existingShop.id), updateData);
      return NextResponse.json({ ...existingShop, ...updateData });
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
  } catch (error) {
    console.error("POST /api/shop error:", error);
    return NextResponse.json({ error: 'Failed to save shop' }, { status: 500 });
  }
}
