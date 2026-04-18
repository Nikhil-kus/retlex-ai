'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Plus, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CatalogSetupPage() {
  const router = useRouter();
  const [shop, setShop] = useState<any>(null);
  const [businessTypes, setBusinessTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        {businessTypes.map(t => (
          <button 
            key={t.id}
            onClick={() => { setSelectedType(t); setSelectedItems(new Set()); }}
            className={`px-6 py-3 rounded-xl border-2 whitespace-nowrap transition-colors font-medium ${selectedType?.id === t.id ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
          >
            {t.name}
          </button>
        ))}
      </div>

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
