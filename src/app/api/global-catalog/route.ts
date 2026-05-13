/**
 * /api/global-catalog
 * ─────────────────────────────────────────────────────────────────────────────
 * Architecture note:
 *   globalCatalog is a read-only template library of products.
 *   It is seeded from the main shop via `node scripts/db-migrate.mjs`.
 *
 *   New shops import from here during setup. Each import creates an
 *   INDEPENDENT COPY inside the shop's own products — editing or deleting
 *   a shop product never affects globalCatalog.
 *
 * GET  — list all global catalog entries (optionally filter by category)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server';
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let q;
    if (category) {
      q = query(
        collection(db, "globalCatalog"),
        where("category", "==", category),
        orderBy("name", "asc")
      );
    } else {
      q = query(collection(db, "globalCatalog"), orderBy("name", "asc"));
    }

    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return NextResponse.json(items);
  } catch (error: any) {
    // Fallback without orderBy if index not ready
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
      try {
        const snap = await getDocs(collection(db, "globalCatalog"));
        const items = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
        return NextResponse.json(items);
      } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch global catalog' }, { status: 500 });
      }
    }
    return NextResponse.json({ error: 'Failed to fetch global catalog' }, { status: 500 });
  }
}
