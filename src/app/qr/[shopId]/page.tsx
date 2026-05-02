import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { Store, Receipt, Clock, Download } from 'lucide-react';
import { getBillLabel } from '@/lib/bill-utils';

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
      return { id: doc.id, ...data, date: data.createdAt ? new Date(data.createdAt) : (data.date ? new Date(data.date) : new Date(0)), items: data.items || [] } as any;
    })
    .filter(b => b.date >= fiveMinsAgo)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="bg-indigo-600 text-white p-8 pt-12 text-center shadow-md rounded-b-[2rem]">
        <div className="bg-white/20 p-4 rounded-full inline-flex mb-4">
          <Store size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold">{shop.name}</h1>
        <p className="text-indigo-100 mt-2 text-sm max-w-xs mx-auto">{shop.address}</p>
      </div>

      <div className="max-w-md mx-auto p-6 -mt-6">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock className="text-indigo-500" size={20} />
              Recent Bills
            </h2>
          </div>

          <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
            Showing bills generated securely in the last 5 minutes. Tap on a bill to view items.
          </p>

          {recentBills.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
              <Receipt size={48} className="text-slate-200" />
              <p className="text-slate-500 font-medium">No recent bills found.</p>
              <p className="text-xs text-slate-400">Ask the shopkeeper to generate your bill.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBills.map((bill: any) => (
                <div key={bill.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 p-4 flex justify-between items-center border-b border-slate-200">
                    <div>
                      <p className="font-bold text-slate-900">{getBillLabel(bill)}</p>
                      <p className="text-xs text-slate-500">{new Date(bill.date).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-indigo-600 text-lg">₹{(bill.totalAmount || 0).toFixed(2)}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider ${bill.status==='PAID'?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}`}>
                        {bill.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-white">
                    <div className="space-y-2 mb-4">
                      {bill.items.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-slate-700 truncate pr-4">{item.quantity}x {item.name}</span>
                          <span className="font-medium text-slate-900 whitespace-nowrap">₹{(item.total || 0).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <a 
                      href={`/history/${bill.id}`} 
                      className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition"
                    >
                      <Download size={16} /> Open & Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <p className="text-center text-xs text-slate-400 mt-6 font-medium tracking-wide">
        POWERED BY KIRANA MVP
      </p>
    </div>
  );
}
