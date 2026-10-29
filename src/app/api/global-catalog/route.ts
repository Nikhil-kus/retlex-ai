import { NextResponse } from 'next/server';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { STARTER_CATALOG } from '@/lib/starter-catalog';
import { getShopType, isShopType } from '@/lib/shop-types';
import { mergeCatalog, type StoredCatalogItem } from '@/lib/catalog-utils';

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const shopId = params.get('shopId');
    const requestedType = params.get('shopType');
    if (requestedType && !isShopType(requestedType)) return NextResponse.json({ error: 'Invalid shop category' }, { status: 400 });
    let type = isShopType(requestedType) ? requestedType : 'kirana' as const;
    if (shopId) {
      const shop = await getDoc(doc(db, 'shops', shopId));
      if (!shop.exists()) return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
      type = getShopType(shop.data());
    }
    const shopsSnap = await getDocs(collection(db, 'shops'));
    const shopTypes = new Map(shopsSnap.docs.map(d => [d.id, getShopType(d.data())]));
    // New shop categories should not download the entire legacy grocery database.
    const matchingShopIds = [...shopTypes].filter(([, value]) => value === type).map(([id]) => id);
    const legacyQueries = [];
    if (type !== 'kirana') {
      for (let start = 0; start < matchingShopIds.length; start += 30) {
        legacyQueries.push(getDocs(query(collection(db, 'products'), where('shopId', 'in', matchingShopIds.slice(start, start + 30)))));
      }
    }
    const [globalSnap, productsSnap, ...legacySnaps] = await Promise.all([
      getDocs(type === 'kirana' ? collection(db, 'globalCatalog') : query(collection(db, 'globalCatalog'), where('shopType', 'in', [type, 'universal']))),
      getDocs(type === 'kirana' ? collection(db, 'products') : query(collection(db, 'products'), where('shopType', 'in', [type, 'universal']))),
      ...legacyQueries,
    ]);
    const items: StoredCatalogItem[] = [
      ...STARTER_CATALOG,
      ...globalSnap.docs.map(d => ({ ...d.data(), id: d.id, name: d.data().name || '' })),
      ...productsSnap.docs.map(d => ({ ...d.data(), id: `shop_${d.id}`, name: d.data().name || '' })),
      ...legacySnaps.flatMap(snapshot => snapshot.docs.map(d => ({ ...d.data(), id: `shop_${d.id}`, name: d.data().name || '' }))),
    ];
    return NextResponse.json(mergeCatalog(items, type, shopTypes));
  } catch (error) {
    console.error('GET /api/global-catalog error:', error);
    return NextResponse.json({ error: 'Failed to fetch catalog. Please try again.' }, { status: 500 });
  }
}
