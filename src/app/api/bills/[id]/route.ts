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
    const { status } = await request.json();
    const { id } = await params;
    await updateDoc(doc(db, "bills", id), { status });
    const bill = { id, status };
    return NextResponse.json(bill);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 });
  }
}
