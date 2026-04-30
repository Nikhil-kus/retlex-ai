import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const docSnap = await getDoc(doc(db, "bills", id));
    if (!docSnap.exists()) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    const bill = { id: docSnap.id, ...docSnap.data() };
    return NextResponse.json(bill);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bill' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const { id } = await params;
    
    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.orderStatus !== undefined) updateData.orderStatus = body.orderStatus;
    
    await updateDoc(doc(db, "bills", id), updateData);
    return NextResponse.json({ id, ...updateData });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 });
  }
}
