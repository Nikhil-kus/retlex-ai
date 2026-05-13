'use client';

/**
 * Catalog Setup Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Three import paths for new shops:
 *
 *   1. Global Catalog  — import from the master product library (your real shop's
 *                        products). Each import is an independent copy — editing
 *                        or deleting it never affects the global catalog.
 *
 *   2. Kirana Preset   — import from the hardcoded KIRANA_PRODUCTS list (~80 items).
 *                        Good for brand-new shops with no existing data.
 *
 *   3. Business Type   — import from Firestore businessTypes templates (Tent House etc.)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Plus, CheckCircle, ArrowLeft, Zap, Globe, Search } from 'lucide-react';
import Link from 'next/link';
import { KIRANA_PRODUCTS } from '@/lib/kirana-catalog';

type Tab = 'global' | 'kirana' | 'business';

export default function CatalogSetupPage() {
  const router = useRouter();
  const [shop, setShop] = useState<any>(null);
  const [businessTypes, setBusinessTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('global');

  // Global catalog state
  const [globalCatalog, setGlobalCatalog] = useState<any[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedGlobal, setSelectedGlobal] = useState<Set<string>>(new Set());
  const [globalCategories, setGlobalCategories] = useState<string[]>([]);
  const [selectedGlobalCategory, setSelectedGlobalCategory] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/shop').then(r => r.json()),
      fetch('/api/business-types').then(r => r.json()),
    ]).then(([shopData, typesData]) => {
      setShop(shopData);
      setBusinessTypes(typesData);
      if (shopData?.businessTypeId) {
        const t = typesData.find((x: any) => x.id === shopData.businessTypeId);
        if (t) setSelectedType(t);
      }
      setLoading(false);
    });
  }, []);

  // Load global catalog when tab is selected
  useEffect(() => {
    if (activeTab !== 'global' || globalCatalog.length > 0) return;
    setGlobalLoading(true);
    fetch('/api/global-catalog')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setGlobalCatalog(data);
          // Extract unique categories
          const cats = [...new Set(data.map((p: any) => p.category).filter(Boolean))].sort() as string[];
          setGlobalCategories(cats);
        }
        setGlobalLoading(false);
      })
      .catch(() => setGlobalLoading(false));
  }, [activeTab]);

  // ── Business type tab helpers ──────────────────────────────────────────────
  const toggleItem = (itemId: string) => {
    const next = new Set(selectedItems);
    if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
    setSelectedItems(next);
  };

  const selectAll = () => {
    if (!selectedType) return;
    if (selectedItems.size === selectedType.items.length) setSelectedItems(new Set());
    else setSelectedItems(new Set(selectedType.items.map((i: any) => i.id)));
  };

  // ── Global catalog tab helpers ─────────────────────────────────────────────
  const toggleGlobal = (id: string) => {
    const next = new Set(selectedGlobal);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedGlobal(next);
  };

  const filteredGlobal = globalCatalog.filter(p => {
    const matchCat = !selectedGlobalCategory || p.category === selectedGlobalCategory;
    const matchSearch = !globalSearch ||
      (p.name || '').toLowerCase().includes(globalSearch.toLowerCase()) ||
      (p.localName || '').toLowerCase().includes(globalSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const selectAllGlobal = () => {
    if (selectedGlobal.size === filteredGlobal.length) setSelectedGlobal(new Set());
    else setSelectedGlobal(new Set(filteredGlobal.map(p => p.id)));
  };

  // ── Import handlers ────────────────────────────────────────────────────────
  const handleImportGlobal = async () => {
    if (selectedGlobal.size === 0) return alert('Select at least one product');
    setSaving(true);
    try {
      const res = await fetch('/api/global-catalog/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: shop.id, productIds: [...selectedGlobal] }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ Imported ${data.imported} products! (${data.skipped} already existed)`);
        router.push('/products');
      } else {
        alert('❌ Import failed: ' + (data.error || 'Unknown error'));
      }
    } catch {
      alert('❌ Network error during import');
    }
    setSaving(false);
  };

  const handleImportKirana = async () => {
    if (!window.confirm(`Import ${KIRANA_PRODUCTS.length} standard kirana products to your catalog?`)) return;
    setSaving(true);
    try {
      const res = await fetch('/api/products/kirana-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: shop.id }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ Imported ${data.count} kirana products!`);
        router.push('/products');
      } else {
        alert('❌ Failed to import kirana products');
      }
    } catch {
      alert('❌ Network error during import');
    }
    setSaving(false);
  };

  const handleImportBusinessType = async () => {
    if (selectedItems.size === 0) return alert('Select at least one item');
    setSaving(true);
    const itemsToImport = selectedType.items.filter((i: any) => selectedItems.has(i.id));
    try {
      const res = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: shop.id,
          businessTypeId: selectedType.id,
          items: itemsToImport.map((i: any) => ({ name: i.name, baseUnit: i.baseUnit })),
        }),
      });
      if (res.ok) {
        alert(`✅ Imported ${itemsToImport.length} items!`);
        router.push('/products');
      } else {
        alert('❌ Failed to import items');
      }
    } catch {
      alert('❌ Network error during import');
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 h-full flex flex-col">
      {/* Header */}
      <div>
        <Link href="/shop/setup" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-4 font-medium">
          <ArrowLeft size={16} /> Back to Setup
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Package className="text-indigo-600" />
          Catalog Import
        </h1>
        <p className="text-slate-500 mt-2">
          Choose how to populate your shop catalog. All imports create independent copies — safe to edit or delete.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('global')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'global' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Globe size={16} /> Global Catalog
        </button>
        <button
          onClick={() => setActiveTab('kirana')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'kirana' ? 'border-amber-500 text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Zap size={16} /> Kirana Preset
        </button>
        <button
          onClick={() => setActiveTab('business')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'business' ? 'border-slate-700 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Package size={16} /> Business Templates
        </button>
      </div>

      {/* ── Global Catalog Tab ─────────────────────────────────────────────── */}
      {activeTab === 'global' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col flex-1 min-h-0">
          <div className="p-6 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Globe className="text-indigo-500" size={20} />
              Master Product Library
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {globalCatalog.length} products from the main shop catalog. Imports are fully independent copies.
            </p>
          </div>

          {globalLoading ? (
            <div className="p-12 text-center text-slate-400">Loading catalog...</div>
          ) : globalCatalog.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Globe size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Global catalog is empty.</p>
              <p className="text-sm mt-1">Run <code className="bg-slate-100 px-1 rounded">node scripts/db-migrate.mjs</code> to seed it from your main shop.</p>
            </div>
          ) : (
            <>
              {/* Filters */}
              <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-48">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={globalSearch}
                    onChange={e => setGlobalSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <select
                  value={selectedGlobalCategory || ''}
                  onChange={e => setSelectedGlobalCategory(e.target.value || null)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="">All Categories</option>
                  {globalCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={selectAllGlobal} className="text-indigo-600 text-sm font-semibold hover:underline whitespace-nowrap">
                  {selectedGlobal.size === filteredGlobal.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Product grid */}
              <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredGlobal.map(p => (
                  <div
                    key={p.id}
                    onClick={() => toggleGlobal(p.id)}
                    className={`p-3 border-2 rounded-xl cursor-pointer flex gap-3 items-start transition-colors ${
                      selectedGlobal.has(p.id) ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className={`mt-0.5 rounded-full w-5 h-5 flex-shrink-0 flex items-center justify-center border ${
                      selectedGlobal.has(p.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                    }`}>
                      {selectedGlobal.has(p.id) && <CheckCircle className="text-white w-4 h-4" />}
                    </div>
                    {p.imageUrl && (
                      <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{p.name}</p>
                      {p.localName && <p className="text-xs text-slate-500">{p.localName}</p>}
                      <p className="text-xs text-slate-400 mt-0.5">
                        ₹{p.price} · {p.baseUnit}
                        {p.category && <span className="ml-1 bg-slate-100 px-1 rounded">{p.category}</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                <button
                  disabled={saving || selectedGlobal.size === 0}
                  onClick={handleImportGlobal}
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  <Plus size={20} />
                  {saving ? 'Importing...' : `Import ${selectedGlobal.size} Selected Products`}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Kirana Preset Tab ──────────────────────────────────────────────── */}
      {activeTab === 'kirana' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Zap className="text-amber-500" size={20} />
              Standard Kirana Store Catalog
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {KIRANA_PRODUCTS.length} essential products commonly found in Indian kirana stores.
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {[
                { label: 'Staples', sub: 'Atta, Rice, Dals', color: 'blue' },
                { label: 'Oils & Spices', sub: 'Oil, Salt, Masala', color: 'green' },
                { label: 'Snacks', sub: 'Biscuits, Noodles', color: 'purple' },
                { label: 'Personal Care', sub: 'Soap, Shampoo', color: 'pink' },
                { label: 'Cleaning', sub: 'Detergent, Vim', color: 'orange' },
                { label: 'Dairy', sub: 'Milk, Tea, Coffee', color: 'cyan' },
              ].map(({ label, sub, color }) => (
                <div key={label} className={`p-3 bg-${color}-50 rounded-lg`}>
                  <p className={`font-semibold text-${color}-900`}>{label}</p>
                  <p className={`text-xs text-${color}-700`}>{sub}</p>
                </div>
              ))}
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-900">
                ⚡ <strong>Quick Import:</strong> Add all {KIRANA_PRODUCTS.length} products at once with pre-configured prices and units. You can edit prices later.
              </p>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
            <button
              disabled={saving}
              onClick={handleImportKirana}
              className="w-full bg-amber-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-600 disabled:opacity-50 transition"
            >
              <Zap size={20} />
              {saving ? 'Importing...' : `Import All ${KIRANA_PRODUCTS.length} Products`}
            </button>
          </div>
        </div>
      )}

      {/* ── Business Templates Tab ─────────────────────────────────────────── */}
      {activeTab === 'business' && (
        <div className="flex flex-col flex-1 min-h-0 space-y-4">
          {/* Type selector */}
          <div className="flex gap-3 overflow-x-auto pb-1">
            {businessTypes.map(t => (
              <button
                key={t.id}
                onClick={() => { setSelectedType(t); setSelectedItems(new Set()); }}
                className={`px-5 py-2.5 rounded-xl border-2 whitespace-nowrap transition-colors font-medium text-sm ${
                  selectedType?.id === t.id ? 'border-slate-700 bg-slate-50 text-slate-900' : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          {selectedType && selectedType.items?.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col min-h-0">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                <div>
                  <h2 className="text-lg font-bold">{selectedType.name} Items</h2>
                  <p className="text-sm text-slate-500">{selectedType.items.length} items available</p>
                </div>
                <button onClick={selectAll} className="text-indigo-600 text-sm font-semibold hover:underline">
                  {selectedItems.size === selectedType.items.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedType.items.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`p-4 border-2 rounded-xl cursor-pointer flex gap-3 items-start transition-colors ${
                      selectedItems.has(item.id) ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className={`mt-0.5 rounded-full w-5 h-5 flex items-center justify-center border ${
                      selectedItems.has(item.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                    }`}>
                      {selectedItems.has(item.id) && <CheckCircle className="text-white w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Unit: <span className="font-medium bg-slate-100 px-1.5 py-0.5 rounded">{item.baseUnit}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                <button
                  disabled={saving || selectedItems.size === 0}
                  onClick={handleImportBusinessType}
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  <Plus size={20} />
                  {saving ? 'Importing...' : `Import ${selectedItems.size} Selected Items`}
                </button>
              </div>
            </div>
          ) : selectedType ? (
            <div className="p-8 text-center text-slate-500 border border-dashed rounded-2xl">
              No items found for this template.
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 border border-dashed rounded-2xl">
              Select a business type above to see available items.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
