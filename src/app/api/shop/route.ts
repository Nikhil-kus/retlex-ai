import { NextResponse } from 'next/server';
import { collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    const querySnapshot = await getDocs(collection(db, "shops"));
    let shop: any = null;
    if (!querySnapshot.empty) {
      shop = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data(), businessType: { name: 'General' } };
    }
    return NextResponse.json(shop);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch shop' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const querySnapshot = await getDocs(collection(db, "shops"));
    let existingShop: any = null;
    if (!querySnapshot.empty) {
      existingShop = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
    }
    
    if (existingShop) {
      const updateData = {
        name: data.name,
        mobile: data.mobile,
        address: data.address,
      };
      await updateDoc(doc(db, "shops", existingShop.id), updateData);
      return NextResponse.json({ ...existingShop, ...updateData });
    } else {
      // Generate a permanent QR code ID
      const qrCodeId = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      const newShop = {
        name: data.name,
        mobile: data.mobile,
        address: data.address,
        qrCodeId
      };
      const docRef = await addDoc(collection(db, "shops"), newShop);
      return NextResponse.json({ id: docRef.id, ...newShop });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save shop' }, { status: 500 });
  }
}
