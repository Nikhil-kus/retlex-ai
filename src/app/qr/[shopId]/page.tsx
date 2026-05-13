import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
export const dynamic = 'force-dynamic';
import { Store } from 'lucide-react';
import { getBillLabel } from '@/lib/bill-utils';
import CustomerQRClient from './CustomerQRClient';

export default async function CustomerQRPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const shopQuery = query(collection(db, "shops"), where("qrCodeId", "==", shopId));
  const shopSnapshot = await getDocs(shopQuery);
  const shop = shopSnapshot.empty ? null : { id: shopSnapshot.docs[0].id, ...shopSnapshot.docs[0].data() } as any;

  if (!shop) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Store className="h-16 w-16 text-slate-300 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800">Shop Not Found</h1>
        <p className="text-slate-500 mt-2">The QR code you scanned is invalid.</p>
      </div>
    );
  }

  // Find bills generated in the last 5 minutes for this shop
  const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
  const billsQuery = query(collection(db, "bills"), where("shopId", "==", shop.id));
  const billsSnapshot = await getDocs(billsQuery);

  const recentBills = billsSnapshot.docs
    .map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.createdAt
          ? new Date(data.createdAt).toISOString()
          : data.date
          ? new Date(data.date).toISOString()
          : new Date(0).toISOString(),
        items: data.items || [],
      } as any;
    })
    .filter(b => new Date(b.date) >= fiveMinsAgo)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <CustomerQRClient
      shop={shop}
      recentBills={recentBills}
      shopId={shop.id}
    />
  );
}
