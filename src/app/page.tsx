import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
export const dynamic = 'force-dynamic';
import Link from "next/link"
import { ArrowRight, Package, Receipt, IndianRupee, Store, History } from "lucide-react"
import { getBillLabel } from "@/lib/bill-utils";
export default async function Dashboard() {
  const querySnapshot = await getDocs(collection(db, "shops"));
  const shop = querySnapshot.empty ? null : { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as any;
  
  if (!shop) {
    return (
      <div className="p-8 max-w-lg mx-auto mt-20 text-center space-y-6">
        <Store className="mx-auto h-16 w-16 text-indigo-500" />
        <h1 className="text-3xl font-bold">Welcome to Kirana MVP</h1>
        <p className="text-slate-600">Please set up your shop profile to get started.</p>
        <Link href="/shop/setup" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-medium transition-colors">
          Set up Shop <ArrowRight size={20} />
        </Link>
      </div>
    )
  }

  const today = new Date()
  today.setHours(0,0,0,0)

  // Fetch some stats
  const productsSnapshot = await getDocs(query(collection(db, "products"), where("shopId", "==", shop.id)));
  const totalProducts = productsSnapshot.size;

  const billsSnapshot = await getDocs(query(collection(db, "bills"), where("shopId", "==", shop.id)));
  const allBills = billsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);

  const todayBills = allBills.filter((b: any) => {
    const bDate = b.createdAt ? new Date(b.createdAt) : (b.date ? new Date(b.date) : new Date(0));
    b.date = bDate; // attach date object for UI
    return bDate >= today;
  });

  const allUnpaid = allBills.filter((b: any) => b.status === 'UNPAID');

  const todaySales = todayBills.reduce((acc: number, bill: any) => acc + bill.totalAmount, 0)
  const todayProfit = todayBills.reduce((acc: number, bill: any) => acc + bill.profit, 0)
  const totalUnpaid = allUnpaid.reduce((acc: number, bill: any) => acc + bill.totalAmount, 0)

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 text-slate-800">Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back to {shop.name}</p>
        </div>
        <Link href="/billing" className="bg-indigo-600 text-white px-6 py-3 font-semibold rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-sm">
          <Receipt size={20} />
          New Bill
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Sales" value={`₹ ${todaySales.toFixed(2)}`} icon={<IndianRupee />} trend={`${todayBills.length} bills`} color="bg-emerald-50 text-emerald-600" />
        <StatCard title="Today's Profit" value={`₹ ${todayProfit.toFixed(2)}`} icon={<IndianRupee />} color="bg-blue-50 text-blue-600" />
        <StatCard title="Unpaid Amount" value={`₹ ${totalUnpaid.toFixed(2)}`} icon={<Receipt />} trend={`${allUnpaid.length} bills`} color="bg-rose-50 text-rose-600" />
        <StatCard title="Total Products" value={totalProducts} icon={<Package />} color="bg-indigo-50 text-indigo-600" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <ActionCard href="/products" title="Manage Catalog" icon={<Package />} />
            <ActionCard href="/shop/setup" title="Shop Settings" icon={<Store />} />
            <ActionCard href="/history" title="View History" icon={<History />} />
            <ActionCard href={`/qr/${shop.qrCodeId}`} title="Customer QR" icon={<Receipt />} external />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold mb-4">Recent Bills</h2>
          {todayBills.length === 0 ? (
            <p className="text-slate-500 text-sm">No bills generated today.</p>
          ) : (
            <div className="space-y-4">
              {todayBills.slice(0, 5).map((b: any) => (
                <div key={b.id} className="flex justify-between items-center pb-2 border-b border-slate-50 last:border-0 text-sm">
                  <div>
                    <span className="font-medium">{getBillLabel(b)}</span>
                    <p className="text-slate-500 text-xs">{b.date.toLocaleTimeString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-slate-800">₹{b.totalAmount.toFixed(2)}</span>
                    <p className={`text-xs ${b.status === 'PAID' ? 'text-emerald-600' : 'text-rose-600'}`}>{b.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color, trend }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-slate-500 font-medium text-sm">{title}</h3>
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        {trend && <p className="text-xs text-slate-500 mt-1">{trend}</p>}
      </div>
    </div>
  )
}

function ActionCard({ href, title, icon, external }: any) {
  return (
    <Link 
      href={href} 
      target={external ? "_blank" : undefined}
      className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-slate-700 gap-2 border border-transparent hover:border-indigo-100 text-sm font-medium"
    >
      {icon}
      <span>{title}</span>
    </Link>
  )
}
