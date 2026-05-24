import { NextResponse } from 'next/server';
import { collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateLocalAliases } from "@/lib/alias-utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const search = searchParams.get('q');

    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const q = query(collection(db, "products"), where("shopId", "==", shopId));
    const querySnapshot = await getDocs(q);
    let products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (search) {
      const s = search.toLowerCase();
      products = products.filter((p: any) => 
        (p.name && p.name.toLowerCase().includes(s)) ||
        (p.localName && p.localName.toLowerCase().includes(s)) ||
        (p.barcode && p.barcode.toLowerCase().includes(s)) ||
        (p.localAliases && p.localAliases.some((alias: string) => alias.toLowerCase().includes(s)))
      );
    }

    products.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

    return NextResponse.json(products);
  } catch (error: any) {
    console.error("GET /api/products error:", error);
    const msg = error?.code === 'permission-denied'
      ? 'Firestore Permission Denied. Check your Firebase security rules.'
      : 'Failed to fetch products';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.shopId || !data.name || !data.sellingPrice || !data.unit) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate local aliases via Gemini
    const aliases = await generateLocalAliases(data.name, data.localName || null);

    const newProduct = {
      name: data.name,
      localName: data.localName || null,
      localAliases: aliases.length > 0 ? aliases : null,
      barcode: data.barcode || null,
      price: parseFloat(data.sellingPrice || 0),
      costPrice: parseFloat(data.costPrice || 0),
      baseUnit: data.unit || "pc",
      baseQuantity: (data.unit === "g" || data.unit === "ml") ? 100 : 1,
      packetWeight: data.packetWeight ? parseFloat(data.packetWeight) : null,
      packetUnit: data.unit === 'pkt' ? data.packetUnit : null,
      category: data.category || null,
      imageUrl: data.imageUrl || null,
      shopId: data.shopId
    };
    
    const docRef = await addDoc(collection(db, "products"), newProduct);
    const product = { id: docRef.id, ...newProduct };

    return NextResponse.json(product);
  } catch (error: any) {
    console.error("POST /api/products error:", error);
    const msg = error?.code === 'permission-denied'
      ? 'Firestore Permission Denied. Check your Firebase security rules.'
      : 'Failed to create product';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
