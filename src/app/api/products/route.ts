import { NextResponse } from 'next/server';
import { collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
        (p.barcode && p.barcode.toLowerCase().includes(s))
      );
    }

    products.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.shopId || !data.name || !data.sellingPrice || !data.unit) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newProduct = {
      name: data.name,
      localName: data.localName || null,
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
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
