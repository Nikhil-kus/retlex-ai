'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function WorkerPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Fetch shop info
  useEffect(() => {
    fetch('/api/shop')
      .then(r => r.json())
      .then(data => {
        setShop(data);
        if (data?.id) fetchPendingBills(data.id);
      });
  }, []);

  // Auto-refresh pending bills every 2 seconds
  useEffect(() => {
    if (!shop?.id) return;

    const interval = setInterval(() => {
      fetchPendingBills(shop.id);
    }, 2000);

    return () => clearInterval(interval);
  }, [shop?.id]);

  const fetchPendingBills = async (shopId: string) => {
    try {
      const res = await fetch(`/api/bills?shopId=${shopId}`);
      if (res.ok) {
        const allBills = await res.json();
        // Filter only PENDING bills
        const pendingBills = allBills.filter((b: any) => b.orderStatus === 'PENDING');
        setBills(pendingBills);
      }
    } catch (error) {
      console.error('Failed to fetch bills:', error);
    }
    setLoading(false);
  };

  const handleMarkDone = async (billId: string) => {
    setUpdatingId(billId);
    try {
      const res = await fetch(`/api/bills/${billId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: 'COMPLETED' })
      });

      if (res.ok) {
        // Remove from list immediately
        setBills(bills.filter(b => b.id !== billId));
      } else {
        alert('Failed to mark bill as done');
      }
    } catch (error) {
      console.error('Error updating bill:', error);
      alert('Error updating bill');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white flex items-center gap-3 mb-2">
            <Clock className="text-amber-400" size={32} />
            Order Queue
          </h1>
          <p className="text-slate-400">
            {shop?.name || 'Kirana Store'} - Pending Orders
          </p>
        </div>

        {/* Status Summary */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-8 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="text-amber-400" size={20} />
            <span className="text-white font-semibold">{bills.length} Pending</span>
          </div>
        </div>

        {/* Bills Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-slate-400 flex flex-col items-center gap-3">
              <Clock className="animate-spin" size={32} />
              <p>Loading orders...</p>
            </div>
          </div>
        ) : bills.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
            <CheckCircle className="mx-auto text-emerald-400 mb-4" size={48} />
            <p className="text-slate-300 text-lg font-medium">All orders completed!</p>
            <p className="text-slate-500 text-sm mt-2">No pending orders at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bills.map((bill) => (
              <div
                key={bill.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition shadow-lg"
              >
                {/* Bill Header */}
                <div className="mb-4 pb-4 border-b border-slate-700">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-white font-bold text-lg">{bill.billNumber}</h3>
                      <p className="text-slate-400 text-xs">
                        {new Date(bill.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <span className="bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <Clock size={12} />
                      PENDING
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="mb-6 space-y-2">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">
                    Items ({bill.items?.length || 0})
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {bill.items?.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-white font-medium text-sm line-clamp-1">
                            {item.name}
                          </span>
                          <span className="text-slate-400 text-xs ml-2 flex-shrink-0">
                            ₹{item.total?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                        <div className="text-slate-500 text-xs">
                          {item.quantity} {item.unit || 'pc'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-slate-900/50 rounded-lg p-3 mb-6 border border-slate-700/50">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Total Amount</span>
                    <span className="text-emerald-400 font-bold text-lg">
                      ₹{bill.totalAmount?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>

                {/* Mark Done Button */}
                <button
                  onClick={() => handleMarkDone(bill.id)}
                  disabled={updatingId === bill.id}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                >
                  <CheckCircle size={20} />
                  {updatingId === bill.id ? 'Marking...' : 'Mark Done'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Auto-refresh indicator */}
        <div className="mt-8 text-center text-slate-500 text-xs">
          Auto-refreshing every 2 seconds
        </div>
      </div>
    </div>
  );
}
