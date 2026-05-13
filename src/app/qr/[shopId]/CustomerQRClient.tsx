'use client';

import { useState, useEffect } from 'react';
import { Store, Receipt, Clock, MessageCircle, Phone, X, ChevronRight } from 'lucide-react';
import { getBillLabel } from '@/lib/bill-utils';

interface BillItem {
  id?: string;
  name: string;
  quantity: number;
  unit?: string;
  total?: number;
}

interface Bill {
  id: string;
  date: string;
  billNumber?: number;
  customerName?: string;
  totalAmount?: number;
  status?: string;
  items: BillItem[];
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

const STORAGE_KEY = 'customer_whatsapp_number';

/** Exact same format as generateWhatsAppMessage() in whatsapp-utils.ts */
function buildMessage(shopName: string, bill: Bill): string {
  let msg = `🏪 ${shopName}\n`;
  msg += `Items:\n`;
  bill.items.forEach(item => {
    const unit = item.unit || 'pc';
    msg += `${item.name} (${item.quantity} ${unit}) - ₹${(item.total || 0).toFixed(2)}\n`;
  });
  msg += `Total Amount: ₹${(bill.totalAmount || 0).toFixed(2)}\n`;
  msg += `Status: ${bill.status === 'PAID' ? '✅ Paid' : '⏳ Unpaid'}\n`;
  msg += `🙏 Thank you for shopping with us!\n`;
  msg += `Visit again 😊`;
  return msg;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return digits;
  return `91${digits}`;
}

export default function CustomerQRClient({ shop, recentBills }: Props) {
  // The bill the customer wants to save
  const [pendingBill, setPendingBill] = useState<Bill | null>(null);
  // Phone number state
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [savedPhone, setSavedPhone] = useState('');

  // Load saved number on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || '';
      if (stored) {
        setSavedPhone(stored);
        setPhone(stored);
      }
    } catch {}
  }, []);

  const openSheet = (bill: Bill) => {
    setPhoneError('');
    setPendingBill(bill);
  };

  const closeSheet = () => {
    setPendingBill(null);
    setPhoneError('');
  };

  const handleSend = () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setPhoneError('Please enter a valid 10-digit WhatsApp number');
      return;
    }

    // Save for next time
    try { localStorage.setItem(STORAGE_KEY, phone); } catch {}
    setSavedPhone(phone);

    const formatted = formatPhone(phone);
    const message = buildMessage(shop.name, pendingBill!);
    const url = `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    closeSheet();
  };

  return (
    <>
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
              Bills from the last 5 minutes. Tap <strong>Save to WhatsApp</strong> to receive your bill on your number.
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
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider ${
                          bill.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {bill.status}
                        </span>
                      </div>
                    </div>

                    {/* Items */}
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

                      {/* Save to WhatsApp button */}
                      <button
                        onClick={() => openSheet(bill)}
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

      {/* ── Phone number bottom sheet ── */}
      {pendingBill && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeSheet}
          />

          {/* Sheet */}
          <div className="relative bg-white rounded-t-3xl p-6 shadow-2xl animate-slide-up">
            {/* Handle */}
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

            {/* Close */}
            <button
              onClick={closeSheet}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="bg-green-100 p-2.5 rounded-full">
                <MessageCircle size={22} className="text-green-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-base">Send Bill to WhatsApp</p>
                <p className="text-xs text-slate-500">Bill will be sent to your number</p>
              </div>
            </div>

            {/* Bill summary */}
            <div className="bg-slate-50 rounded-xl p-3 mb-5 border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-700">{getBillLabel(pendingBill)}</span>
                <span className="text-sm font-bold text-indigo-600">₹{(pendingBill.totalAmount || 0).toFixed(2)}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{pendingBill.items.length} item{pendingBill.items.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Phone input */}
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Your WhatsApp Number
            </label>
            <div className="flex items-center gap-2 border-2 border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-green-400 transition-colors mb-1">
              <Phone size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-500 text-sm font-medium">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="Enter 10-digit number"
                value={phone}
                onChange={e => {
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                  setPhoneError('');
                }}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                autoFocus
                className="flex-1 outline-none text-slate-900 text-sm bg-transparent"
              />
            </div>

            {phoneError && (
              <p className="text-xs text-rose-500 mb-3 ml-1">{phoneError}</p>
            )}

            {savedPhone && savedPhone === phone && (
              <p className="text-xs text-green-600 mb-3 ml-1">✓ Using your saved number</p>
            )}

            <p className="text-[11px] text-slate-400 mb-5">
              Your number is saved on this device for next time. We never store it on our servers.
            </p>

            {/* Send button */}
            <button
              onClick={handleSend}
              className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white py-3.5 rounded-xl flex items-center justify-center gap-2 text-base font-bold transition-colors shadow-md"
            >
              <MessageCircle size={18} />
              Send to My WhatsApp
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.25s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </>
  );
}
