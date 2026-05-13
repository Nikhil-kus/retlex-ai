'use client';

import { Store, Receipt, Clock, MessageCircle } from 'lucide-react';
import { getBillLabel } from '@/lib/bill-utils';

interface Bill {
  id: string;
  date: string;
  billNumber?: number;
  customerName?: string;
  totalAmount?: number;
  status?: string;
  items: { id?: string; name: string; quantity: number; unit?: string; total?: number }[];
}

interface Shop {
  id: string;
  name: string;
  address?: string;
  mobile?: string;
}

interface Props {
  shop: Shop;
  recentBills: Bill[];
}

/**
 * Builds the exact same WhatsApp message the shop owner sends when billing.
 * Matches generateWhatsAppMessage() in src/lib/whatsapp-utils.ts
 */
function buildWhatsAppMessage(shopName: string, bill: Bill): string {
  let message = `🏪 ${shopName}\n`;
  message += `Items:\n`;

  bill.items.forEach(item => {
    const unit = item.unit || 'pc';
    const itemTotal = item.total || 0;
    message += `${item.name} (${item.quantity} ${unit}) - ₹${itemTotal.toFixed(2)}\n`;
  });

  message += `Total Amount: ₹${(bill.totalAmount || 0).toFixed(2)}\n`;
  message += `Status: ${bill.status === 'PAID' ? '✅ Paid' : '⏳ Unpaid'}\n`;
  message += `🙏 Thank you for shopping with us!\n`;
  message += `Visit again 😊`;

  return message;
}

/**
 * Opens WhatsApp with the bill message.
 * Opens wa.me without a phone number so the customer can send it to themselves
 * (WhatsApp "Message Yourself" / Saved Messages).
 */
function saveToWhatsApp(shopName: string, bill: Bill) {
  const message = buildWhatsAppMessage(shopName, bill);
  const encoded = encodeURIComponent(message);
  // wa.me without a number opens WhatsApp with the message ready to share
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

export default function CustomerQRClient({ shop, recentBills }: Props) {
  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-8 pt-12 text-center shadow-md rounded-b-[2rem]">
        <div className="bg-white/20 p-4 rounded-full inline-flex mb-4">
          <Store size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold">{shop.name}</h1>
        {shop.address && (
          <p className="text-indigo-100 mt-2 text-sm max-w-xs mx-auto">{shop.address}</p>
        )}
      </div>

      <div className="max-w-md mx-auto p-6 -mt-6">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Clock className="text-indigo-500" size={20} />
            Recent Bills
          </h2>

          <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
            Showing bills from the last 5 minutes. Tap <strong>Save to WhatsApp</strong> to send the bill to yourself.
          </p>

          {recentBills.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
              <Receipt size={48} className="text-slate-200" />
              <p className="text-slate-500 font-medium">No recent bills found.</p>
              <p className="text-xs text-slate-400">Ask the shopkeeper to generate your bill.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBills.map(bill => (
                <div key={bill.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  {/* Bill header */}
                  <div className="bg-slate-50 p-4 flex justify-between items-center border-b border-slate-200">
                    <div>
                      <p className="font-bold text-slate-900">{getBillLabel(bill)}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(bill.date).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-indigo-600 text-lg">
                        ₹{(bill.totalAmount || 0).toFixed(2)}
                      </p>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider ${
                          bill.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {bill.status}
                      </span>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="p-4 bg-white">
                    <div className="space-y-2 mb-4">
                      {bill.items.map((item, idx) => (
                        <div key={item.id ?? idx} className="flex justify-between text-sm">
                          <span className="text-slate-700 truncate pr-4">
                            {item.quantity}× {item.name}
                            {item.unit && item.unit !== 'pc' ? ` (${item.unit})` : ''}
                          </span>
                          <span className="font-medium text-slate-900 whitespace-nowrap">
                            ₹{(item.total || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Single Save to WhatsApp button */}
                    <button
                      onClick={() => saveToWhatsApp(shop.name, bill)}
                      className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-colors shadow-sm"
                    >
                      <MessageCircle size={17} />
                      Save to WhatsApp
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 mt-6 font-medium tracking-wide">
        POWERED BY RETLEX AI
      </p>
    </div>
  );
}
