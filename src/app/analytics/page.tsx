import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';
import { ChartColumn, TrendingUp, IndianRupee, PackageOpen } from 'lucide-react';

export default async function AnalyticsPage() {
  const shop = await prisma.shop.findFirst();
  if (!shop) return <div className="p-8">Please setup shop first.</div>;

  const now = new Date();
  
  // Start of today, week, month
  const today = new Date(now.setHours(0,0,0,0));
  
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [dailyBills, weeklyBills, monthlyBills, allBills] = await Promise.all([
    prisma.bill.findMany({ where: { shopId: shop.id, date: { gte: today } }, include: { items: true } }),
    prisma.bill.findMany({ where: { shopId: shop.id, date: { gte: startOfWeek } }, include: { items: true } }),
    prisma.bill.findMany({ where: { shopId: shop.id, date: { gte: startOfMonth } }, include: { items: true } }),
    prisma.bill.findMany({ where: { shopId: shop.id }, include: { items: true } })
  ]);

  const calcStats = (bills: any[]) => ({
    sales: bills.reduce((acc, b) => acc + b.totalAmount, 0),
    profit: bills.reduce((acc, b) => acc + b.profit, 0),
    count: bills.length
  });

  const daily = calcStats(dailyBills);
  const weekly = calcStats(weeklyBills);
  const monthly = calcStats(monthlyBills);

  // Top products
  const productSales: Record<string, { name: string, qty: number, revenue: number }> = {};
  allBills.forEach(b => {
    b.items.forEach((item: any) => {
      if (!productSales[item.name]) {
        productSales[item.name] = { name: item.name, qty: 0, revenue: 0 };
      }
      productSales[item.name].qty += item.quantity;
      productSales[item.name].revenue += item.total;
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <ChartColumn className="text-indigo-600" />
          Business Analytics
        </h1>
        <p className="text-slate-500 mt-1">Track your store performance and sales metrics.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Daily */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-t-4 border-t-indigo-500">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Today</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">Sales</span>
              <span className="text-xl font-bold text-slate-900">₹{daily.sales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">Profit</span>
              <span className="text-lg font-semibold text-emerald-600">₹{daily.profit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">Bills Generated</span>
              <span className="font-medium text-slate-700">{daily.count}</span>
            </div>
          </div>
        </div>

        {/* Weekly */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-t-4 border-t-emerald-500">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">This Week</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">Sales</span>
              <span className="text-xl font-bold text-slate-900">₹{weekly.sales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">Profit</span>
              <span className="text-lg font-semibold text-emerald-600">₹{weekly.profit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">Bills Generated</span>
              <span className="font-medium text-slate-700">{weekly.count}</span>
            </div>
          </div>
        </div>

        {/* Monthly */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-t-4 border-t-blue-500">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">This Month</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">Sales</span>
              <span className="text-xl font-bold text-slate-900">₹{monthly.sales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">Profit</span>
              <span className="text-lg font-semibold text-emerald-600">₹{monthly.profit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">Bills Generated</span>
              <span className="font-medium text-slate-700">{monthly.count}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2"><TrendingUp className="text-indigo-500" size={20} /> Top Selling Products</h2>
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
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2 text-indigo-200"><IndianRupee size={20} /> Financial Summary</h2>
            <p className="text-slate-400 text-sm">Lifetime metrics across all generated bills.</p>
          </div>
          <div className="grid grid-cols-2 gap-6 mt-8">
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Revenue</p>
              <p className="text-3xl font-bold">₹{calcStats(allBills).sales.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Profit</p>
              <p className="text-3xl font-bold text-emerald-400">₹{calcStats(allBills).profit.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-700/50 flex align-center justify-between">
            <span className="text-slate-300">Total Unpaid Pipeline</span>
            <span className="font-bold text-rose-400">₹{allBills.filter(b => b.status === 'UNPAID').reduce((a,b)=>a+b.totalAmount,0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
