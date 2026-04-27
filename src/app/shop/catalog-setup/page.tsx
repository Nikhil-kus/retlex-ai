'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Plus, CheckCircle, ArrowLeft, Zap } from 'lucide-react';
import Link from 'next/link';
import { KIRANA_PRODUCTS } from '@/lib/kirana-catalog';

export default function CatalogSetupPage() {
  const router = useRouter();
  const [shop, setShop] = useState<any>(null);
  const [businessTypes, setBusinessTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKiranaOption, setShowKiranaOption] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/shop').then(r => r.json()),
      fetch('/api/business-types').then(r => r.json())
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

  const toggleItem = (itemId: string) => {
    const next = new Set(selectedItems);
    if (next.has(itemId)) next.delete(itemId);
    else next.add(itemId);
    setSelectedItems(next);
  };

  const selectAll = () => {
    if (!selectedType) return;
    if (selectedItems.size === selectedType.items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(selectedType.items.map((i: any) => i.id)));
    }
  };

  const handleImport = async () => {
    if (selectedItems.size === 0) return alert('Select at least one item');
    setSaving(true);

    const itemsToImport = selectedType.items.filter((i: any) => selectedItems.has(i.id));

    const res = await fetch('/api/products/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopId: shop.id,
        businessTypeId: selectedType.id,
        items: itemsToImport.map((i: any) => ({ name: i.name, baseUnit: i.baseUnit }))
      })
    });

    if (res.ok) {
      alert(`Successfully imported ${itemsToImport.length} items to your catalog!`);
      router.push('/products');
    } else {
      alert('Failed to import items');
    }
    setSaving(false);
  };

  const handleImportKirana = async () => {
    if (!window.confirm(`Import ${KIRANA_PRODUCTS.length} standard kirana products to your catalog?`)) return;
    setSaving(true);

    const res = await fetch('/api/products/kirana-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId: shop.id })
    });

    if (res.ok) {
      const data = await res.json();
      alert(`✅ Successfully imported ${data.count} kirana products to your catalog!`);
      router.push('/products');
    } else {
      alert('❌ Failed to import kirana products');
    }
    setSaving(false);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 h-full flex flex-col">
      <div>
        <Link href="/shop/setup" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-4 font-medium">
          <ArrowLeft size={16} /> Back to Setup
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <Package className="text-indigo-600" />
          Catalog Template Import
        </h1>
        <p className="text-slate-500 mt-2">Select your business type and quickly populate your catalog with standard items.</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        <button 
          onClick={() => { setShowKiranaOption(true); setSelectedType(null); setSelectedItems(new Set()); }}
          className={`px-6 py-3 rounded-xl border-2 whitespace-nowrap transition-colors font-medium flex items-center gap-2 ${showKiranaOption ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
        >
          <Zap size={18} />
          Kirana Store
        </button>
        {businessTypes.map(t => (
          <button 
            key={t.id}
            onClick={() => { setSelectedType(t); setShowKiranaOption(false); setSelectedItems(new Set()); }}
            className={`px-6 py-3 rounded-xl border-2 whitespace-nowrap transition-colors font-medium ${selectedType?.id === t.id ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {showKiranaOption && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Zap className="text-amber-500" size={20} />
              Standard Kirana Store Catalog
            </h2>
            <p className="text-sm text-slate-500 mt-1">{KIRANA_PRODUCTS.length} essential products commonly found in Indian kirana stores</p>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-semibold text-blue-900">Staples</p>
                <p className="text-xs text-blue-700">Atta, Rice, Dals</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="font-semibold text-green-900">Oils & Spices</p>
                <p className="text-xs text-green-700">Oil, Salt, Masala</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="font-semibold text-purple-900">Snacks</p>
                <p className="text-xs text-purple-700">Biscuits, Noodles</p>
              </div>
              <div className="p-3 bg-pink-50 rounded-lg">
                <p className="font-semibold text-pink-900">Personal Care</p>
                <p className="text-xs text-pink-700">Soap, Shampoo</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="font-semibold text-orange-900">Cleaning</p>
                <p className="text-xs text-orange-700">Detergent, Vim</p>
              </div>
              <div className="p-3 bg-cyan-50 rounded-lg">
                <p className="font-semibold text-cyan-900">Dairy</p>
                <p className="text-xs text-cyan-700">Milk, Tea, Coffee</p>
              </div>
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

      {selectedType && selectedType.items && selectedType.items.length > 0 ? (
        <div className="bg-white  rounded-2xl shadow-sm border border-slate-100 flex-1 flex flex-col min-h-0">
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
                className={`p-4 border-2 rounded-xl cursor-pointer flex gap-3 items-start transition-colors ${selectedItems.has(item.id) ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 hover:border-slate-300'}`}
              >
                <div className={`mt-0.5 rounded-full w-5 h-5 flex items-center justify-center border ${selectedItems.has(item.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                  {selectedItems.has(item.id) && <CheckCircle className="text-white w-4 h-4" />}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
                  <p className="text-xs text-slate-500 mt-1">Unit: <span className="font-medium bg-slate-100 px-1.5 py-0.5 rounded">{item.baseUnit}</span></p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
            <button 
              disabled={saving || selectedItems.size === 0}
              onClick={handleImport}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              <Plus />
              Import {selectedItems.size} Selected Items
            </button>
          </div>
        </div>
      ) : (
        selectedType && <div className="p-8 text-center text-slate-500 border border-dashed rounded-2xl">No items found for this template.</div>
      )}
    </div>
  );
}
