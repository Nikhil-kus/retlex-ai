'use client';

/**
 * Root page — smart entry point.
 *
 * Flow:
 *   1. Check localStorage for `lastShopId` → redirect to /[shopId]/billing
 *   2. Fetch /api/shop (uses ACTIVE_SHOP_ID or first shop) → redirect
 *   3. No shop found → show inline "Create your first shop" form
 *
 * This means:
 *   - Returning users land directly in their shop (zero extra clicks)
 *   - New users see a clean onboarding form right here
 *   - No dead-end redirects to broken /shop/setup pages
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Loader2, ArrowRight } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', mobile: '', address: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    const go = async () => {
      // 1. localStorage fast path
      try {
        const lastId = localStorage.getItem('lastShopId');
        if (lastId) { router.replace(`/${lastId}/billing`); return; }
      } catch {}

      // 2. Server-side pinned shop
      try {
        const res = await fetch('/api/shop');
        if (res.ok) {
          const shop = await res.json();
          if (shop?.id) {
            try { localStorage.setItem('lastShopId', shop.id); } catch {}
            router.replace(`/${shop.id}/billing`);
            return;
          }
        }
      } catch {}

      // 3. No shop — show create form
      setChecking(false);
      setShowCreate(true);
    };
    go();
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.mobile.trim()) {
      setError('Shop name and mobile are required.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to create shop');
        return;
      }
      const shop = await res.json();
      try { localStorage.setItem('lastShopId', shop.id); } catch {}
      router.replace(`/${shop.id}/billing`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Loading spinner while checking
  if (checking && !showCreate) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
          <p className="text-sm">Loading your shop…</p>
        </div>
      </div>
    );
  }

  // First-time setup
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg mb-4">
            <Store size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            Retlex<span className="text-indigo-600">AI</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm">AI-powered kirana billing</p>
        </div>

        {/* Create shop card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Set up your shop</h2>
          <p className="text-slate-500 text-sm mb-6">Enter your shop details to get started.</p>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Shop Name *</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Sharma Kirana Store"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number *</label>
              <input
                required
                type="tel"
                value={form.mobile}
                onChange={e => setForm({ ...form, mobile: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address <span className="text-slate-400">(optional)</span></label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Shop address"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <p className="text-rose-500 text-sm bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={creating}
              className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-60 text-sm"
            >
              {creating
                ? <><Loader2 size={18} className="animate-spin" /> Creating shop…</>
                : <><ArrowRight size={18} /> Create Shop & Start Billing</>}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Retlex AI · AI-powered kirana billing
        </p>
      </div>
    </div>
  );
}
