'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, X, Check } from 'lucide-react';

export default function WorkerPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  // Map to store packed items for each bill: billId -> Set of item indices
  const [billPackedItems, setBillPackedItems] = useState<Map<string, Set<number>>>(new Map());

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
        setSelectedBill(null);
        // Remove packed items for this bill
        const newBillPackedItems = new Map(billPackedItems);
        newBillPackedItems.delete(billId);
        setBillPackedItems(newBillPackedItems);
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

  const toggleItemPacked = (itemIndex: number) => {
    if (!selectedBill) return;
    
    const billId = selectedBill.id;
    const newBillPackedItems = new Map(billPackedItems);
    
    // Get or create the set for this bill
    const packedSet = newBillPackedItems.get(billId) || new Set<number>();
    
    // Toggle the item
    if (packedSet.has(itemIndex)) {
      packedSet.delete(itemIndex);
    } else {
      packedSet.add(itemIndex);
    }
    
    // Update the map
    if (packedSet.size === 0) {
      newBillPackedItems.delete(billId);
    } else {
      newBillPackedItems.set(billId, packedSet);
    }
    
    setBillPackedItems(newBillPackedItems);
  };

  // Get packed items for current selected bill
  const currentBillPackedItems = selectedBill ? (billPackedItems.get(selectedBill.id) || new Set<number>()) : new Set<number>();

  const allItemsPacked = selectedBill && selectedBill.items?.length > 0 && 
    selectedBill.items.every((_, idx: number) => currentBillPackedItems.has(idx));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3 mb-2">
            <Clock className="text-amber-400" size={32} />
            Order Queue
          </h1>
          <p className="text-slate-400">
            {shop?.name || 'Kirana Store'} - Pending Orders
          </p>
        </div>

        {/* Status Summary */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="text-amber-400" size={20} />
            <span className="text-white font-semibold">{bills.length} Pending</span>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bills List - Left Side */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
              <div className="bg-slate-700/50 p-4 border-b border-slate-700">
                <h2 className="text-white font-bold text-lg">Pending Orders</h2>
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-400">
                  <Clock className="animate-spin mx-auto mb-2" size={24} />
                  <p>Loading...</p>
                </div>
              ) : bills.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <CheckCircle className="mx-auto mb-2 text-emerald-400" size={32} />
                  <p className="text-sm">All orders completed!</p>
                </div>
              ) : (
                <div className="space-y-2 p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {bills.map((bill) => (
                    <button
                      key={bill.id}
                      onClick={() => {
                        setSelectedBill(bill);
                      }}
                      className={`w-full text-left p-4 rounded-lg border-2 transition ${
                        selectedBill?.id === bill.id
                          ? 'bg-amber-500/20 border-amber-500 shadow-lg shadow-amber-500/20'
                          : 'bg-slate-700/30 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-white font-bold text-sm">{bill.billNumber}</h3>
                        <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-xs font-semibold">
                          {bill.items?.length || 0} items
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs mb-1">
                        {new Date(bill.createdAt).toLocaleTimeString()}
                      </p>
                      <p className="text-emerald-400 font-semibold text-sm">
                        ₹{bill.totalAmount?.toFixed(2) || '0.00'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bill Details - Right Side */}
          <div className="lg:col-span-2">
            {!selectedBill ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center h-full flex flex-col items-center justify-center">
                <Clock className="text-slate-600 mb-4" size={48} />
                <p className="text-slate-400 text-lg">Select an order to view details</p>
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden flex flex-col h-full">
                {/* Bill Header */}
                <div className="bg-slate-700/50 p-6 border-b border-slate-700">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedBill.billNumber}</h2>
                      <p className="text-slate-400 text-sm mt-1">
                        {new Date(selectedBill.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedBill(null);
                      }}
                      className="text-slate-400 hover:text-white transition"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Customer: {selectedBill.customerName || 'Walk-in'}</span>
                    <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-sm font-semibold">
                      PENDING
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  <h3 className="text-white font-bold text-lg mb-4">Items to Pack ({selectedBill.items?.length || 0})</h3>
                  {selectedBill.items?.map((item: any, idx: number) => {
                    const isPacked = currentBillPackedItems.has(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleItemPacked(idx)}
                        className={`w-full p-4 rounded-lg border-2 transition text-left ${
                          isPacked
                            ? 'bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-500/20'
                            : 'bg-slate-700/30 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center mt-1 transition ${
                            isPacked
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-slate-500'
                          }`}>
                            {isPacked && <Check size={16} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-base ${isPacked ? 'text-emerald-300 line-through' : 'text-white'}`}>
                              {item.name}
                            </p>
                            {item.localName && (
                              <p className="text-slate-400 text-sm">({item.localName})</p>
                            )}
                            <p className="text-slate-400 text-sm mt-1">
                              {item.quantity} {item.unit || 'pc'} • ₹{item.total?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="bg-slate-700/50 border-t border-slate-700 p-6 space-y-4">
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-400">Total Amount</span>
                      <span className="text-emerald-400 font-bold text-xl">
                        ₹{selectedBill.totalAmount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {currentBillPackedItems.size} of {selectedBill.items?.length || 0} items packed
                    </div>
                  </div>

                  <button
                    onClick={() => handleMarkDone(selectedBill.id)}
                    disabled={updatingId === selectedBill.id || !allItemsPacked}
                    className={`w-full py-4 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition ${
                      allItemsPacked
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-slate-700 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <CheckCircle size={20} />
                    {updatingId === selectedBill.id ? 'Completing...' : allItemsPacked ? 'Complete Order' : 'Pack All Items First'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Auto-refresh indicator */}
        <div className="mt-6 text-center text-slate-500 text-xs">
          Auto-refreshing every 2 seconds
        </div>
      </div>
    </div>
  );
}
