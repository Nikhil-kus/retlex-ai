import { NextResponse } from 'next/server';
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const data = await request.json();
    const { id } = await params;
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
    const product = { id, ...updateData };

    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteDoc(doc(db, "products", id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
