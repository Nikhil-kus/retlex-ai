'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Eye, CheckCircle } from 'lucide-react';

export default function UnpaidBillsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/shop')
      .then(r => r.json())
      .then(data => {
        setShop(data);
        if (data) fetchBills(data.id);
      });
  }, []);

  const fetchBills = async (shopId: string) => {
    const res = await fetch(`/api/bills?shopId=${shopId}`);
    if (res.ok) {
      const allBills = await res.json();
      setBills(allBills.filter((b: any) => b.status === 'UNPAID'));
    }
    setLoading(false);
  };

  const markAsPaid = async (id: string) => {
    if (!confirm('Mark this bill as paid?')) return;
    await fetch(`/api/bills/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAID' })
    });
    setBills(bills.filter(b => b.id !== id));
  };

  const totalUnpaid = bills.reduce((acc, b) => acc + b.totalAmount, 0);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <FileText className="text-rose-600" />
            Unpaid Bills
          </h1>
          <p className="text-slate-500 mt-1">Manage pending payments from customers.</p>
        </div>
        <div className="bg-rose-50 border border-rose-100 px-6 py-3 rounded-xl flex items-center justify-between gap-4">
          <span className="text-rose-600 font-semibold">Total Pending</span>
          <span className="text-2xl font-bold text-rose-700">₹{totalUnpaid.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">Loading unpaid bills...</div>
        ) : bills.length === 0 ? (
          <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
            <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4 opacity-50" />
            <p className="text-lg font-medium text-slate-600">All cleared!</p>
            <p className="text-sm">You have no unpaid bills.</p>
          </div>
        ) : (
          bills.map((b) => (
            <div key={b.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:border-rose-200 transition">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="font-semibold text-slate-900">{b.billNumber}</span>
                  <span className="text-xs text-slate-400">{new Date(b.date).toLocaleDateString()}</span>
                </div>
                <div className="mb-4">
                  <p className="font-medium text-slate-800">{b.customerName || 'Walk-in'}</p>
                  <p className="text-sm text-slate-500">{b.customerPhone || 'No phone number'}</p>
                </div>
              </div>
              
              <div className="mt-auto">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-slate-500">Amount Due</span>
                  <span className="text-xl font-bold text-rose-600">₹{b.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => markAsPaid(b.id)} className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-2 rounded-lg text-sm font-semibold transition">
                     Mark Paid
                  </button>
                  <Link href={`/history/${b.id}`} className="bg-slate-50 text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition">
                    <Eye size={20} />
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
