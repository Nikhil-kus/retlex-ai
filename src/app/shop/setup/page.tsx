'use client';

import { useState, useEffect } from 'react';
import { Store, Save, QrCode } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";

export default function ShopSetupPage() {
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: ''
  });

  useEffect(() => {
    fetch('/api/shop')
      .then(r => r.json())
      .then(data => {
        if (data) {
          setShop(data);
          setFormData({ name: data.name, mobile: data.mobile, address: data.address || '' });
        }
        setLoading(false);
      });
  }, []);



  const handleSubmit = async (e: any) => {
    e.preventDefault();

    try {
      await addDoc(collection(db, "shops"), {
        name: formData.name,
        mobile: formData.mobile,
        address: formData.address,
      });

      alert("Shop saved successfully ✅");
    } catch (error) {
      console.error("Firebase error:", error);
      alert("Error saving shop ❌");
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Store className="text-indigo-600" />
          Shop Profile Setup
        </h1>
        <p className="text-slate-500 mt-2">Manage your shop details and fixed QR code for customers.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Shop Name *</label>
              <input
                required
                type="text"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Super Kirana Store"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number *</label>
              <input
                required
                type="tel"
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={formData.mobile}
                onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="e.g. 9876543210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <textarea
                rows={3}
                className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full shop address..."
              />
            </div>

            <button
              disabled={saving}
              type="submit"
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={20} />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>

          <div className="pt-6 border-t border-slate-100">
            <h3 className="font-semibold mb-2">Import Default Catalog</h3>
            <p className="text-sm text-slate-500 mb-4">Want to quickly add preset items for Kirana or Tent House?</p>
            <a href="/shop/catalog-setup" className="block text-center w-full bg-slate-100 text-slate-700 font-medium py-3 rounded-lg hover:bg-slate-200 transition-colors">
              Import Catalog Templates
            </a>
          </div>
        </div>

        {shop && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-indigo-50 rounded-full">
              <QrCode size={48} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Your Customer QR</h2>
              <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">Customers can scan this code to view their latest bills generated in the last 5 minutes.</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 w-full mt-4">
              <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Your QR Link</p>
              <a
                href={`/qr/${shop.qrCodeId}`}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 font-medium break-all text-sm hover:underline flex items-center justify-center gap-2"
              >
                {typeof window !== 'undefined' ? window.location.origin : ''}/qr/{shop.qrCodeId}
              </a>
            </div>
            <p className="text-xs text-rose-500 mt-2 font-medium">Print this URL or generate a QR code for it.</p>
          </div>
        )}
      </div>
    </div>
  );
}
