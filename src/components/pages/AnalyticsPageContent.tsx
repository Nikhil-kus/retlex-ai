'use client';

/**
 * AnalyticsPageContent — extracted from src/app/analytics/page.tsx
 * Converted from server component to client component.
 * Accepts shop/shopId as props instead of scanning the shops collection.
 */

import { useState, useEffect } from 'react';
import { ChartColumn, TrendingUp, IndianRupee, PackageOpen } from 'lucide-react';
import type { Shop, Bill } from '@/types';

interface Props {
  shop: Shop;
  shopId: string;
}

export default function AnalyticsPageContent({ shop, shopId }: Props) {
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/bills?shopId=${shopId}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setAllBills(data); })
      .finally(() => setLoading(false));
  }, [shopId]);

  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const withDate = allBills.map(b => ({
    ...b,
    _date: b.createdAt ? new Date(b.createdAt) : new Date(0),
  }));

  const dailyBills = withDate.filter(b => b._date >= today);
  const weeklyBills = withDate.filter(b => b._date >= startOfWeek);
  const monthlyBills = withDate.filter(b => b._date >= startOfMonth);

  const calcStats = (bills: typeof withDate) => ({
    sales: bills.reduce((acc, b) => acc + b.totalAmount, 0),
    profit: bills.reduce((acc, b) => acc + b.profit, 0),
    count: bills.length,
  });

  const daily = calcStats(dailyBills);
  const weekly = calcStats(weeklyBills);
  const monthly = calcStats(monthlyBills);
  const lifetime = calcStats(withDate);

  // Top products
  const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
  allBills.forEach(b => {
    b.items.forEach(item => {
      if (!productSales[item.name]) productSales[item.name] = { name: item.name, qty: 0, revenue: 0 };
      productSales[item.name].qty += item.quantity;
      productSales[item.name].revenue += item.total;
    });
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  if (loading) {
    return (
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="text-slate-400 text-sm">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <ChartColumn className="text-indigo-600" />
          Business Analytics
        </h1>
        <p className="text-slate-500 mt-1">Track performance for {shop.name}.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {[
          { label: 'Today', stats: daily, color: 'border-t-indigo-500' },
          { label: 'This Week', stats: weekly, color: 'border-t-emerald-500' },
          { label: 'This Month', stats: monthly, color: 'border-t-blue-500' },
        ].map(({ label, stats, color }) => (
          <div key={label} className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-t-4 ${color}`}>
            <h2 className="text-lg font-semibold text-slate-700 mb-4">{label}</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Sales</span>
                <span className="text-xl font-bold text-slate-900">₹{stats.sales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Profit</span>
                <span className="text-lg font-semibold text-emerald-600">₹{stats.profit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Bills Generated</span>
                <span className="font-medium text-slate-700">{stats.count}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="text-indigo-500" size={20} /> Top Selling Products
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No sales data available yet.</p>
          ) : (
            <div className="space-y-4">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex justify-between items-center pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-300">#{i + 1}</span>
                    <div>
                      <p className="font-medium text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.qty} items sold</p>
                    </div>
                  </div>
                  <span className="font-bold text-indigo-600">₹{p.revenue.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-2xl shadow-sm text-white flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-indigo-200">
              <IndianRupee size={20} /> Financial Summary
            </h2>
            <p className="text-slate-400 text-sm">Lifetime metrics across all generated bills.</p>
          </div>
          <div className="grid grid-cols-2 gap-6 mt-8">
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Revenue</p>
              <p className="text-3xl font-bold">₹{lifetime.sales.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Profit</p>
              <p className="text-3xl font-bold text-emerald-400">₹{lifetime.profit.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-700/50 flex items-center justify-between">
            <span className="text-slate-300">Total Unpaid Pipeline</span>
            <span className="font-bold text-rose-400">
              ₹{withDate.filter(b => b.status === 'UNPAID').reduce((a, b) => a + b.totalAmount, 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
