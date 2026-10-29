'use client';

/**
 * Root page — smart entry point.
 *
 * Flow:
 *   1. Validate the remembered shop and resume setup or billing.
 *   2. New visitors choose a category, enter details, then choose products.
 *   3. ?new=1 deliberately starts another shop without replacing existing data.
 *
 * This means:
 *   - Returning users land directly in their shop (zero extra clicks)
 *   - New users see a clean onboarding form right here
 *   - No dead-end redirects to broken /shop/setup pages
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Loader2, ArrowRight } from 'lucide-react';
import ShopTypePicker from '@/components/ShopTypePicker';
import { shopEntryPath, type ShopType } from '@/lib/shop-types';

export default function RootPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', mobile: '', address: '' });
  const [error, setError] = useState('');
  const [shopType, setShopType] = useState<ShopType | ''>('');
  const [step, setStep] = useState<'category' | 'details'>('category');

  useEffect(() => {
    const go = async () => {
      if (new URLSearchParams(window.location.search).get('new') === '1') {
        setChecking(false);
        setShowCreate(true);
        return;
      }
      // 1. localStorage fast path
      try {
        const lastId = localStorage.getItem('lastShopId');
        if (lastId) {
          const res = await fetch(`/api/shops/${encodeURIComponent(lastId)}`);
          if (res.ok) {
            router.replace(shopEntryPath(await res.json()));
            return;
          }
          if (res.status === 404) localStorage.removeItem('lastShopId');
          else setError('Unable to load your saved shop. Refresh to retry, or create a new shop below.');
        }
      } catch { setError('Unable to load your saved shop. Please check your connection.'); }

      // 3. No shop — show create form
      setChecking(false);
      setShowCreate(true);
    };
    go();
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (creating) return;
    if (!shopType || !form.name.trim() || !form.mobile.trim()) {
      setError('Shop name and mobile are required.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, shopType }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to create shop');
        return;
      }
      const shop = await res.json();
      try { localStorage.setItem('lastShopId', shop.id); } catch {}
      router.replace(shopEntryPath(shop));
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Loading spinner while checking
  if (checking && !showCreate) {
    return (
      <div className="flex w-full items-center justify-center h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Loader2 size={40} className="animate-spin text-emerald-500" />
            <div className="absolute inset-0 animate-ping">
              <Loader2 size={40} className="text-emerald-300 opacity-40" />
            </div>
          </div>
          <p className="text-sm text-neutral-600 font-medium">Loading your shop…</p>
        </div>
      </div>
    );
  }

  // First-time setup
  return (
    <main className="w-full h-dvh overflow-y-auto bg-gradient-to-br from-emerald-50 via-white to-amber-50 gradient-mesh p-4 sm:p-8">
      <div className="w-full max-w-2xl mx-auto py-6 fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl shadow-xl mb-4 hover:shadow-2xl hover:scale-105 transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent"></div>
            <Store size={36} className="text-white relative z-10" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Retlex<span className="text-amber-500">AI</span>
          </h1>
          <p className="text-neutral-600 mt-3 text-base font-medium">Simple billing for every kind of shop</p>
        </div>

        {/* Create shop card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-neutral-200/50 p-8 card-interactive">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{step === 'category' ? 'Step 1 of 3 · Shop category' : 'Step 2 of 3 · Shop details'}</p>
          </div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-2">{step === 'category' ? 'What kind of shop do you run?' : 'Set up your shop'}</h2>
          <p className="text-neutral-600 text-sm mb-6 leading-relaxed">{step === 'category' ? 'Choose a category, then select the products you sell.' : 'Enter your details. Next, choose products for your shop.'}</p>

          {step === 'category' ? <>
            <ShopTypePicker value={shopType} onChange={setShopType} />
            <button 
              onClick={() => setStep('details')} 
              disabled={!shopType} 
              className="mt-6 w-full rounded-2xl gradient-primary p-4 text-white font-bold text-base hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed btn-primary relative overflow-hidden transition-all duration-300"
            >
              Continue →
            </button>
            {error && <p role="alert" className="mt-3 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">{error}</p>}
          </> : <>
          <button 
            disabled={creating} 
            onClick={() => setStep('category')} 
            className="mb-4 text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline underline-offset-2 transition-all"
          >
            ← Change shop category
          </button>

          <form onSubmit={handleCreate} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2">Shop Name *</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder={shopType === 'tent' ? 'e.g. Sharma Tent House' : shopType === 'electronics' ? 'e.g. Sharma Electronics' : 'e.g. Sharma Kirana Store'}
                className="w-full border-2 border-neutral-200 rounded-2xl px-4 py-3.5 text-base bg-neutral-50 focus:bg-white focus:border-emerald-500 focus:shadow-lg transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2">Mobile Number *</label>
              <input
                required
                type="tel"
                value={form.mobile}
                onChange={e => setForm({ ...form, mobile: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full border-2 border-neutral-200 rounded-2xl px-4 py-3.5 text-base bg-neutral-50 focus:bg-white focus:border-emerald-500 focus:shadow-lg transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2">Address <span className="text-neutral-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                placeholder="Shop address"
                className="w-full border-2 border-neutral-200 rounded-2xl px-4 py-3.5 text-base bg-neutral-50 focus:bg-white focus:border-emerald-500 focus:shadow-lg transition-all duration-200"
              />
            </div>

            {error && (
              <p className="text-rose-600 text-sm bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 font-medium">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={creating}
              className="w-full gradient-primary text-white font-bold py-4 rounded-2xl hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed text-base btn-primary relative overflow-hidden"
            >
              {creating
                ? <><Loader2 size={20} className="animate-spin" /> Creating shop…</>
                : <><ArrowRight size={20} /> Create Shop & Choose Products</>}
            </button>
          </form>
          </>}
        </div>

        <p className="text-center text-sm text-neutral-500 mt-8 font-medium">
          Retlex AI · Kirana, Tent House & Electronics
        </p>
      </div>
    </main>
  );
}
