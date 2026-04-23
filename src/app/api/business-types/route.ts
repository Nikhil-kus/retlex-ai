import { NextResponse } from 'next/server';
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    const q = query(collection(db, "businessTypes"), orderBy("name", "asc"));
    const querySnapshot = await getDocs(q);
    const businessTypes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(businessTypes);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch business types' }, { status: 500 });
  }
}
