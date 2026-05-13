'use client';

import { useState, useEffect } from 'react';
import { Store, Save, QrCode, ExternalLink, Printer } from 'lucide-react';

export default function ShopSetupPage() {
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: ''
  });

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch('/api/shop')
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setShop(data);
          setFormData({ name: data.name || '', mobile: data.mobile || '', address: data.address || '' });
        }
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        setShop(data);
        alert('Shop saved successfully ✅');
      } else {
        alert('Error saving shop ❌');
      }
    } catch {
      alert('Error saving shop ❌');
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  const qrUrl = shop?.qrCodeId ? `${origin}/qr/${shop.qrCodeId}` : null;
  const qrImageUrl = qrUrl
    ? `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(qrUrl)}&choe=UTF-8`
    : null;

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
        {/* Left: form */}
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

        {/* Right: QR panel */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-4">
          <div className="p-4 bg-indigo-50 rounded-full">
            <QrCode size={40} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Customer QR Code</h2>
            <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
              Print this QR and place it at your counter. Customers scan it to view their latest bill (generated in the last 5 minutes) and can download it.
            </p>
          </div>

          {qrImageUrl ? (
            <>
              {/* QR image */}
              <div className="bg-white border-4 border-indigo-100 rounded-2xl p-3 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrImageUrl}
                  alt="Customer QR Code"
                  width={200}
                  height={200}
                  className="rounded-lg"
                />
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 w-full text-left">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-1">QR Link</p>
                <p className="text-xs text-indigo-600 break-all font-medium">{qrUrl}</p>
              </div>

              {/* How it works */}
              <div className="bg-indigo-50 rounded-xl p-4 w-full text-left text-sm space-y-1.5">
                <p className="font-bold text-indigo-800 text-xs uppercase tracking-widest mb-2">How it works</p>
                {[
                  'Print this QR and stick it at your billing counter',
                  'After billing, customer scans QR → sees their bill instantly',
                  'Customer can download or share the bill via WhatsApp',
                  'QR link is permanent — never changes',
                ].map((s, i) => (
                  <p key={i} className="text-indigo-700 flex gap-2 items-start">
                    <span className="text-indigo-400 mt-0.5">•</span> {s}
                  </p>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 w-full">
                <a
                  href={qrUrl!}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
                >
                  <ExternalLink size={15} /> Preview
                </a>
                <a
                  href={`/qr/${shop.qrCodeId}/print`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition"
                >
                  <Printer size={15} /> Print Poster
                </a>
              </div>
            </>
          ) : (
            <div className="text-slate-400 text-sm py-6 space-y-2">
              <QrCode size={48} className="mx-auto opacity-20" />
              <p>QR code ID not found.</p>
              <p className="text-xs">Save your shop profile first to generate a QR code.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
