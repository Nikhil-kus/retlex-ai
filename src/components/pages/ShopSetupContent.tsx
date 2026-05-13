'use client';

/**
 * ShopSetupContent
 * ─────────────────────────────────────────────────────────────────────────────
 * Full shop management page with:
 *   1. Shop picker  — switch between existing shops
 *   2. Create shop  — create a brand-new shop
 *   3. Edit profile — update name / mobile / address
 *   4. Worker QR    — printable/downloadable QR that opens /[shopId]/worker
 *   5. Customer QR  — printable/downloadable QR that opens /qr/[qrCodeId]
 *                     (customer orders page, no auth needed)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store, Save, Plus, ChevronDown, Check,
  Users, ShoppingBag, Package, Loader2, X,
} from 'lucide-react';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import type { Shop } from '@/types';

interface Props {
  shop: Shop;
  shopId: string;
  onSaved?: () => Promise<void>;
}

// ── tiny tab type ─────────────────────────────────────────────────────────────
type Tab = 'profile' | 'worker-qr' | 'customer-qr';

export default function ShopSetupContent({ shop, shopId, onSaved }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // ── profile form ──────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: shop.name || '',
    mobile: shop.mobile || '',
    address: shop.address || '',
  });

  // keep form in sync if parent refreshes shop
  useEffect(() => {
    setFormData({ name: shop.name || '', mobile: shop.mobile || '', address: shop.address || '' });
  }, [shop]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/shops/${shopId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        await onSaved?.();
      } else {
        alert('Error saving shop ❌');
      }
    } catch {
      alert('Error saving shop ❌');
    } finally {
      setSaving(false);
    }
  };

  // ── shop picker / create ──────────────────────────────────────────────────
  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingShops, setLoadingShops] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newShop, setNewShop] = useState({ name: '', mobile: '', address: '' });
  const pickerRef = useRef<HTMLDivElement>(null);

  const loadShops = async () => {
    setLoadingShops(true);
    try {
      const res = await fetch('/api/shops');
      if (res.ok) setAllShops(await res.json());
    } catch {}
    setLoadingShops(false);
  };

  const openPicker = () => {
    setPickerOpen(true);
    loadShops();
  };

  // close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    if (pickerOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  const switchShop = (id: string) => {
    setPickerOpen(false);
    try { localStorage.setItem('lastShopId', id); } catch {}
    router.push(`/${id}/shop/setup`);
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShop.name || !newShop.mobile) return;
    setCreating(true);
    try {
      const res = await fetch('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newShop),
      });
      if (res.ok) {
        const created: Shop = await res.json();
        try { localStorage.setItem('lastShopId', created.id); } catch {}
        router.push(`/${created.id}/billing`);
      } else {
        const err = await res.json();
        alert('Failed to create shop: ' + (err.error || 'Unknown error'));
      }
    } catch {
      alert('Network error creating shop');
    } finally {
      setCreating(false);
    }
  };

  // ── URLs ──────────────────────────────────────────────────────────────────
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const workerUrl = `${origin}/${shopId}/worker`;
  const customerUrl = shop.qrCodeId ? `${origin}/qr/${shop.qrCodeId}` : '';

  // ── tabs config ───────────────────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile',     label: 'Shop Profile',  icon: <Store size={16} /> },
    { id: 'worker-qr',  label: 'Worker QR',     icon: <Users size={16} /> },
    { id: 'customer-qr',label: 'Customer QR',   icon: <ShoppingBag size={16} /> },
  ];

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">

      {/* ── Page header + shop switcher ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Store className="text-indigo-600" size={28} />
            Shop Setup
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage profile, QR codes and switch shops.</p>
        </div>

        {/* Shop switcher button */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={openPicker}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-300 transition text-sm font-medium text-slate-700"
          >
            <Store size={16} className="text-indigo-500" />
            <span className="max-w-[140px] truncate">{shop.name}</span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {pickerOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Your Shops</span>
                <button onClick={() => setPickerOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              </div>

              {/* Shop list */}
              <div className="max-h-52 overflow-y-auto">
                {loadingShops ? (
                  <div className="p-4 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Loading…
                  </div>
                ) : allShops.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-sm">No shops found</div>
                ) : (
                  allShops.map(s => (
                    <button
                      key={s.id}
                      onClick={() => switchShop(s.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition ${s.id === shopId ? 'bg-indigo-50' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.id === shopId ? 'bg-indigo-600' : 'bg-slate-100'}`}>
                        <Store size={14} className={s.id === shopId ? 'text-white' : 'text-slate-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                        <p className="text-xs text-slate-400 truncate">{s.mobile}</p>
                      </div>
                      {s.id === shopId && <Check size={14} className="text-indigo-600 flex-shrink-0" />}
                    </button>
                  ))
                )}
              </div>

              {/* Create new shop */}
              <div className="border-t border-slate-100 p-3">
                {!showCreateForm ? (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
                  >
                    <Plus size={15} />
                    Create New Shop
                  </button>
                ) : (
                  <form onSubmit={handleCreateShop} className="space-y-2">
                    <p className="text-xs font-semibold text-slate-600 mb-2">New Shop Details</p>
                    <input
                      required
                      type="text"
                      placeholder="Shop name *"
                      value={newShop.name}
                      onChange={e => setNewShop({ ...newShop, name: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      required
                      type="tel"
                      placeholder="Mobile number *"
                      value={newShop.mobile}
                      onChange={e => setNewShop({ ...newShop, mobile: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <input
                      type="text"
                      placeholder="Address (optional)"
                      value={newShop.address}
                      onChange={e => setNewShop({ ...newShop, address: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creating}
                        className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-1"
                      >
                        {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        {creating ? 'Creating…' : 'Create'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition ${
              activeTab === t.id
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab: Profile ────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h2 className="font-bold text-slate-800 text-lg">Shop Profile</h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Shop Name *</label>
              <input
                required type="text"
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sharma Kirana Store"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number *</label>
              <input
                required type="tel"
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                value={formData.mobile}
                onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="e.g. 9876543210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <textarea
                rows={3}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm resize-none"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full shop address…"
              />
            </div>

            <button
              disabled={saving} type="submit"
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </form>

          {/* Quick links */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quick Links</p>
            <a
              href={`/${shopId}/shop/catalog-setup`}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 transition text-sm font-medium text-slate-700"
            >
              <Package size={16} className="text-indigo-500" />
              Import Catalog Templates
            </a>
          </div>
        </div>
      )}

      {/* ── Tab: Worker QR ──────────────────────────────────────────────── */}
      {activeTab === 'worker-qr' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Users size={20} className="text-amber-500" />
              Worker QR Code
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Give this QR to your shop workers. Scanning it opens the order queue directly — no login needed.
              Workers can install it as a PWA (Add to Home Screen) for quick access.
            </p>
          </div>

          {/* How it works */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">How it works</p>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>Worker scans QR → opens the order queue page</li>
              <li>Worker taps "Add to Home Screen" → installed as PWA app</li>
              <li>Auto-refreshes every 2 seconds — always shows live orders</li>
              <li>Worker marks orders as packed → status updates instantly</li>
            </ul>
          </div>

          <QRCodeDisplay
            url={workerUrl}
            label="Worker Order Queue"
            sublabel={shop.name}
            headerBg="bg-amber-500"
            headerText="text-white"
            size={220}
          />

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-xs text-slate-500 font-medium mb-1">Direct URL</p>
            <a
              href={workerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 text-xs break-all hover:underline"
            >
              {workerUrl}
            </a>
          </div>
        </div>
      )}

      {/* ── Tab: Customer QR ────────────────────────────────────────────── */}
      {activeTab === 'customer-qr' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <ShoppingBag size={20} className="text-indigo-500" />
              Customer QR Code
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Print this QR and place it at your counter. Customers scan it to view their latest bill
              (generated in the last 5 minutes) and can download it.
            </p>
          </div>

          {/* How it works */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-indigo-800 uppercase tracking-wide">How it works</p>
            <ul className="text-xs text-indigo-700 space-y-1 list-disc list-inside">
              <li>Print this QR and stick it at your billing counter</li>
              <li>After billing, customer scans QR → sees their bill instantly</li>
              <li>Customer can download or share the bill via WhatsApp</li>
              <li>QR link is permanent — never changes</li>
            </ul>
          </div>

          {customerUrl ? (
            <>
              <QRCodeDisplay
                url={customerUrl}
                label="View Your Bill"
                sublabel={shop.name}
                headerBg="bg-indigo-600"
                headerText="text-white"
                size={220}
              />

              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-xs text-slate-500 font-medium mb-1">Permanent QR URL</p>
                <a
                  href={customerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 text-xs break-all hover:underline"
                >
                  {customerUrl}
                </a>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              QR code ID not found. Please save your shop profile first.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
