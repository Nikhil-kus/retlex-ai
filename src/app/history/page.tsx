'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { History as HistoryIcon, Search, Eye, Download, CheckCircle } from 'lucide-react';
import { getBillLabel } from '@/lib/bill-utils';

export default function HistoryPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [search, setSearch] = useState('');
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
      setBills(await res.json());
    }
    setLoading(false);
  };

  const filteredBills = bills.filter(b => 
    getBillLabel(b).toLowerCase().includes(search.toLowerCase()) || 
    (b.customerPhone && b.customerPhone.includes(search))
  );

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <HistoryIcon className="text-indigo-600" />
            Bill History
          </h1>
          <p className="text-slate-500 mt-1">View and manage all your past bills.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search by bill number or customer phone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 font-medium">Bill Number / Date</th>
                <th className="px-6 py-3 font-medium">Customer Details</th>
                <th className="px-6 py-3 font-medium">Amount & Profit</th>
                <th className="px-6 py-3 font-medium text-center">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading bills...</td></tr>
              ) : filteredBills.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No bills found.</td></tr>
              ) : (
                filteredBills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{getBillLabel(b)}</div>
                      <div className="text-xs text-slate-500">{new Date(b.createdAt).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900">{b.customerName || 'Walk-in'}</div>
                      <div className="text-xs text-slate-500">{b.customerPhone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">₹{b.totalAmount.toFixed(2)}</div>
                      <div className="text-xs text-emerald-600 font-medium">Profit: ₹{b.profit.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${b.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/history/${b.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition font-medium text-xs">
                        <Eye size={14} /> View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
