'use client';

import { useState, useEffect } from 'react';
import { Package, Search, Plus, Pencil, Trash, X } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', localName: '', barcode: '',
    sellingPrice: '', costPrice: '', unit: '', category: '', imageUrl: '',
    packetWeight: '', packetUnit: 'g'
  });

  useEffect(() => {
    fetch('/api/shop')
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setShop(data);
          fetchProducts(data.id, '');
        } else {
          setShop(null); // or leave as null
        }
      })
  }, []);

  useEffect(() => {
    const timeoutInt = setTimeout(() => {
      if (shop) fetchProducts(shop.id, search);
    }, 300);
    return () => clearTimeout(timeoutInt);
  }, [search]);

  const fetchProducts = async (shopId: string, q: string) => {
    setLoading(true);
    const res = await fetch(`/api/products?shopId=${shopId}&q=${encodeURIComponent(q)}`);
    if (res.ok) setProducts(await res.json());
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ name: '', localName: '', barcode: '', sellingPrice: '', costPrice: '', unit: 'pc', category: '', imageUrl: '', packetWeight: '', packetUnit: 'g' });
    setEditingId(null);
  };

  const handleOpenEdit = (p: any) => {
    setFormData({
      name: p.name, localName: p.localName || '', barcode: p.barcode || '',
      sellingPrice: p.price ? p.price.toString() : (p.sellingPrice?.toString() || ''), costPrice: p.costPrice.toString(),
      unit: p.baseUnit || p.unit, category: p.category || '', imageUrl: p.imageUrl || '',
      packetWeight: p.packetWeight ? p.packetWeight.toString() : '', packetUnit: p.packetUnit || 'g'
    });
    setEditingId(p.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    fetchProducts(shop.id, search);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, shopId: shop.id };
    const url = editingId ? `/api/products/${editingId}` : '/api/products';
    const method = editingId ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    setIsModalOpen(false);
    fetchProducts(shop.id, search);
    resetForm();
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      {!shop && !loading && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl mb-6">
          <strong>Database Error or Shop Not Found:</strong> Could not connect to Firebase, or you haven't set up a shop yet. Please configure your Firebase environment variables in `.env` and complete the shop setup!
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Package className="text-indigo-600" />
            Product Catalog
          </h1>
          <p className="text-slate-500 mt-1">Manage your inventory, prices, and AI references.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          disabled={!shop}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={20} /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, local name or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-6 py-3 font-medium">Product Name</th>
                <th className="px-6 py-3 font-medium">Local/Barcode</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium text-right">Price (₹)</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading products...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No products found. Add your first product!</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-500">Unit: {p.unit}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-600">{p.localName || '-'}</div>
                      <div className="text-xs text-slate-400">{p.barcode || 'No barcode'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{p.category || '-'}</td>
                    <td className="px-6 py-4 text-right font-medium">₹{(p.price || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenEdit(p)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md transition"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-md transition"><Trash size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:bg-slate-100 p-1.5 rounded-full"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                  <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="e.g. Tata Salt 1kg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Local/Hindi Name</label>
                  <input value={formData.localName} onChange={e => setFormData({ ...formData, localName: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="e.g. टाटा नमक" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price (₹) *</label>
                  <input required type="number" step="0.01" value={formData.sellingPrice} onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price (₹)</label>
                  <input type="number" step="0.01" value={formData.costPrice} onChange={e => setFormData({ ...formData, costPrice: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit Type *</label>
                  <select required value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="pc">Piece (pc)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="pkt">Packet (pkt)</option>
                    <option value="ltr">Liter (ltr)</option>
                    <option value="g">Gram (g)</option>
                  </select>
                </div>
                {formData.unit === 'pkt' && (
                  <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Packet Weight/Volume</label>
                      <input type="number" step="0.01" value={formData.packetWeight} onChange={e => setFormData({ ...formData, packetWeight: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="e.g. 84" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Packet Unit</label>
                      <select value={formData.packetUnit} onChange={e => setFormData({ ...formData, packetUnit: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none">
                        <option value="g">Gram (g)</option>
                        <option value="ml">Milliliter (ml)</option>
                        <option value="kg">Kilogram (kg)</option>
                        <option value="ltr">Liter (ltr)</option>
                      </select>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Barcode</label>
                  <input value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="Scan or type barcode" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="e.g. Grocery" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Image URL (For AI Vision)</label>
                  <input value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2" placeholder="https://..." />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-4 text-sm font-medium">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm">{editingId ? 'Update Product' : 'Add Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
