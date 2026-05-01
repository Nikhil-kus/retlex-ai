import { NextResponse } from 'next/server';
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const data = await request.json();
    const { id } = await params;
    
    // Only update price fields - much faster than full update
    const updateData = {
      price: parseFloat(data.sellingPrice || 0),
      costPrice: parseFloat(data.costPrice || 0),
    };
    
    await updateDoc(doc(db, "products", id), updateData);
    
    return NextResponse.json({ id, ...updateData });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update price' }, { status: 500 });
  }
}
