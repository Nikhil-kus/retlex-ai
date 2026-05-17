import { NextResponse } from 'next/server';
import { doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const data = await request.json();
    const { id } = await params;

    // Ownership check — shopId must be provided and must match the product's shopId
    if (data.shopId) {
      const existing = await getDoc(doc(db, "products", id));
      if (!existing.exists()) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      if (existing.data().shopId !== data.shopId) {
        return NextResponse.json({ error: 'Forbidden: product does not belong to this shop' }, { status: 403 });
      }
    }

    const updateData = {
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
    };
    await updateDoc(doc(db, "products", id), updateData);
    return NextResponse.json({ id, ...updateData });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const data = await request.json();
    const { id } = await params;

    // Ownership check
    if (data.shopId) {
      const existing = await getDoc(doc(db, "products", id));
      if (!existing.exists()) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      if (existing.data().shopId !== data.shopId) {
        return NextResponse.json({ error: 'Forbidden: product does not belong to this shop' }, { status: 403 });
      }
    }

    const updateData: Record<string, any> = {};
    if (data.price !== undefined) updateData.price = parseFloat(data.price);
    if (data.costPrice !== undefined) updateData.costPrice = parseFloat(data.costPrice);
    if (data.location !== undefined) updateData.location = data.location || null;
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    await updateDoc(doc(db, "products", id), updateData);
    return NextResponse.json({ id, ...updateData });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to patch product' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Ownership check — read shopId from query param or request body
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    if (shopId) {
      const existing = await getDoc(doc(db, "products", id));
      if (!existing.exists()) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      if (existing.data().shopId !== shopId) {
        return NextResponse.json({ error: 'Forbidden: product does not belong to this shop' }, { status: 403 });
      }
    }

    await deleteDoc(doc(db, "products", id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
