'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer, Share2 } from 'lucide-react';

export default function BillViewPage() {
  const params = useParams();
  const router = useRouter();
  const [bill, setBill] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/bills/${params.id}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) setBill(data);
      });
  }, [params.id]);

  if (!bill) return <div className="p-8 text-center text-slate-500">Loading bill...</div>;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    // Generate text for WhatsApp
    let text = `*${bill.shop?.name || 'Kirana Store'}*\n`;
    text += `Bill No: ${bill.billNumber}\n`;
    text += `Date: ${new Date(bill.date).toLocaleString()}\n\n`;
    text += `*Items:*\n`;
    bill.items.forEach((item: any) => {
      text += `- ${item.name} (${item.quantity} ${item.unit}) : ₹${item.total}\n`;
    });
    text += `\n*Total: ₹{(bill.totalAmount || 0).toFixed(2)}*`;
    
    // Fallback shareable QR link (if deployed, use real host)
    text += `\n\nView Online: https://yourdomain.com/qr/${bill.shop?.qrCodeId || ''}`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition font-medium">
          <ArrowLeft size={20} /> Back
        </button>
        <div className="flex gap-2">
          <button onClick={handleWhatsAppShare} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium transition">
            <Share2 size={18} /> Share WA
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium transition shadow-sm">
            <Printer size={18} /> Print
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0">
        <div className="text-center pb-6 border-b border-slate-200 border-dashed">
          <h1 className="text-3xl font-bold text-slate-900">{bill.shop?.name || 'Kirana Store'}</h1>
          <p className="text-slate-500 mt-1">{bill.shop?.address}</p>
          <p className="text-slate-500">Mobile: {bill.shop?.mobile}</p>
        </div>

        <div className="flex justify-between py-6 border-b border-slate-200 border-dashed">
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold">Bill To</p>
            <p className="font-medium text-slate-900 mt-1">{bill.customerName || 'Cash Customer'}</p>
            {bill.customerPhone && <p className="text-slate-600 text-sm">{bill.customerPhone}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase font-semibold">Bill Info</p>
            <p className="font-medium text-slate-900 mt-1">{bill.billNumber}</p>
            <p className="text-slate-600 text-sm">{new Date(bill.date).toLocaleString()}</p>
            <p className={`text-xs mt-1 font-bold ${bill.status === 'PAID' ? 'text-emerald-500' : 'text-rose-500'}`}>{bill.status}</p>
          </div>
        </div>

        <div className="py-6">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-xs uppercase border-b border-slate-200">
                <th className="pb-3 font-semibold">Item</th>
                <th className="pb-3 font-semibold text-center">Qty</th>
                <th className="pb-3 font-semibold text-right">Price</th>
                <th className="pb-3 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bill.items.map((item: any) => (
                <tr key={item.id}>
                  <td className="py-3">
                    <p className="font-medium text-slate-800">{item.name}</p>
                  </td>
                  <td className="py-3 text-center text-slate-600">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-3 text-right text-slate-600">
                    ₹{(item.price || item.sellingPrice || 0).toFixed(2)}
                  </td>
                  <td className="py-3 text-right font-medium text-slate-800">
                    ₹{(item.total || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-4 flex flex-col items-end border-t border-slate-200 border-dashed">
          <div className="flex justify-between w-full max-w-xs text-lg font-bold">
            <span className="text-slate-600">Subtotal:</span>
            <span className="text-slate-900">₹{(bill.totalAmount || 0).toFixed(2)}</span>
          </div>
          <p className="text-xs text-slate-400 mt-4 text-center w-full">Thank you for shopping with us!</p>
        </div>
      </div>
    </div>
  );
}
