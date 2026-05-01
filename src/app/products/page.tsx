'use client';

import { useState, useEffect } from 'react';
import { Package, Search, Plus, Pencil, Trash, X, ChevronDown } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [shop, setShop] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [updatingPriceId, setUpdatingPriceId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', localName: '', barcode: '',
    sellingPrice: '', costPrice: '', unit: '', category: '', imageUrl: '',
    packetWeight: '', packetUnit: 'g'
  });

  // Quick price edit state
  const [quickPriceEdit, setQuickPriceEdit] = useState<{ id: string; price: string } | null>(null);

  useEffect(() => {
    fetch('/api/shop')
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setShop(data);
          fetchProducts(data.id, '');
        } else {
          setShop(null);
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
    if (res.ok) {
      const data = await res.json();
      setProducts(data);
      // Auto-expand first category
      if (data.length > 0) {
        const firstCategory = data[0].category || 'Uncategorized';
        setExpandedCategories(new Set([firstCategory]));
      }
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({ name: '', localName: '', barcode: '', sellingPrice: '', costPrice: '', unit: 'pc', category: '', imageUrl: '', packetWeight: '', packetUnit: 'g' });
    setEditingId(null);
  };

  const handleOpenEdit = (p: any) => {
    setFormData({
      name: p.name, localName: p.localName || '', barcode: p.barcode || '',
      sellingPrice: p.price ? p.price.toString() : (p.sellingPrice?.toString() || ''), costPrice: p.costPrice ? p.costPrice.toString() : '',
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

  const handleQuickPriceUpdate = async (productId: string, newPrice: string) => {
    if (!newPrice || isNaN(parseFloat(newPrice))) return;
    
    setUpdatingPriceId(productId);
    try {
      const res = await fetch(`/api/products/${productId}/price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellingPrice: newPrice, costPrice: '' })
      });

      if (res.ok) {
        // Update local state
        setProducts(products.map(p => 
          p.id === productId ? { ...p, price: parseFloat(newPrice) } : p
        ));
        setQuickPriceEdit(null);
      }
    } catch (error) {
      console.error('Failed to update price:', error);
    } finally {
      setUpdatingPriceId(null);
    }
  };

  const toggleProductSelection = (productId: string) => {
    const next = new Set(selectedProducts);
    if (next.has(productId)) next.delete(productId);
    else next.add(productId);
    setSelectedProducts(next);
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return alert('Select at least one product');
    if (!confirm(`Delete ${selectedProducts.size} product(s)? This cannot be undone.`)) return;

    setBulkDeleting(true);
    const res = await fetch('/api/products/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopId: shop.id,
        productIds: Array.from(selectedProducts)
      })
    });

    if (res.ok) {
      const data = await res.json();
      alert(`✅ Successfully deleted ${data.deletedCount} product(s)`);
      setSelectedProducts(new Set());
      fetchProducts(shop.id, search);
    } else {
      alert('❌ Failed to delete products');
    }
    setBulkDeleting(false);
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

  // Group products by category
  const groupedProducts = products.reduce((acc, product) => {
    const category = product.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {} as Record<string, any[]>);

  const categories = Object.keys(groupedProducts).sort();

  const toggleCategory = (category: string) => {
    const next = new Set(expandedCategories);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    setExpandedCategories(next);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {!shop && !loading && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl mb-6">
          <strong>Database Error or Shop Not Found:</strong> Could not connect to Firebase, or you haven't set up a shop yet. Please configure your Firebase environment variables in `.env` and complete the shop setup!
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <Package className="text-indigo-600" />
            Product Catalog
          </h1>
          <p className="text-slate-500 mt-1">Manage your inventory and prices.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedProducts.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition flex items-center justify-center gap-2 font-medium disabled:opacity-50 text-sm md:text-base"
            >
              <Trash size={18} /> Delete {selectedProducts.size}
            </button>
          )}
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            disabled={!shop}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
          >
            <Plus size={18} /> Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, local name or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm md:text-base"
          />
        </div>
      </div>

      {/* Products by Category */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No products found. Add your first product!</div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 md:px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition border-b border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <ChevronDown
                    size={20}
                    className={`text-slate-600 transition ${expandedCategories.has(category) ? 'rotate-180' : ''}`}
                  />
                  <h2 className="font-bold text-slate-900 text-sm md:text-base">{category}</h2>
                  <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    {groupedProducts[category].length}
                  </span>
                </div>
              </button>

              {/* Products Grid */}
              {expandedCategories.has(category) && (
                <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedProducts[category].map((p) => (
                    <div
                      key={p.id}
                      className={`border-2 rounded-lg p-4 transition ${
                        selectedProducts.has(p.id)
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="flex items-start gap-3 mb-3">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(p.id)}
                          onChange={() => toggleProductSelection(p.id)}
                          className="w-5 h-5 rounded border-slate-300 cursor-pointer mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 text-sm md:text-base line-clamp-2">{p.name}</h3>
                          {p.localName && (
                            <p className="text-xs text-slate-500 mt-0.5">{p.localName}</p>
                          )}
                        </div>
                      </div>

                      {/* Price - Prominent Display */}
                      <div className="mb-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        {quickPriceEdit?.id === p.id ? (
                          <div className="flex gap-2">
                            <input
                              type="number"
                              step="0.01"
                              value={quickPriceEdit.price}
                              onChange={(e) => setQuickPriceEdit({ ...quickPriceEdit, price: e.target.value })}
                              className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm"
                              autoFocus
                            />
                            <button
                              onClick={() => handleQuickPriceUpdate(p.id, quickPriceEdit.price)}
                              disabled={updatingPriceId === p.id}
                              className="bg-emerald-600 text-white px-3 py-1 rounded text-sm hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setQuickPriceEdit({ id: p.id, price: p.price?.toString() || '' })}
                            className="w-full text-left hover:opacity-70 transition"
                          >
                            <div className="text-xs text-slate-600 mb-1">Selling Price</div>
                            <div className="text-2xl font-bold text-emerald-700">₹{(p.price || 0).toFixed(2)}</div>
                          </button>
                        )}
                      </div>

                      {/* Details */}
                      <div className="space-y-2 mb-4 text-xs text-slate-600">
                        <div className="flex justify-between">
                          <span>Unit:</span>
                          <span className="font-medium">{p.unit || p.baseUnit || 'pc'}</span>
                        </div>
                        {p.barcode && (
                          <div className="flex justify-between">
                            <span>Barcode:</span>
                            <span className="font-medium">{p.barcode}</span>
                          </div>
                        )}
                        {p.costPrice && (
                          <div className="flex justify-between">
                            <span>Cost:</span>
                            <span className="font-medium">₹{(p.costPrice || 0).toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions - Only show when selected or on hover */}
                      {selectedProducts.has(p.id) && (
                        <div className="flex gap-2 pt-3 border-t border-slate-200">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="flex-1 p-2 text-indigo-600 hover:bg-indigo-50 rounded transition flex items-center justify-center gap-1 text-sm"
                          >
                            <Pencil size={14} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="flex-1 p-2 text-rose-600 hover:bg-rose-50 rounded transition flex items-center justify-center gap-1 text-sm"
                          >
                            <Trash size={14} /> Delete
                          </button>
                        </div>
                      )}
                      {!selectedProducts.has(p.id) && (
                        <div className="flex gap-2 pt-3 border-t border-slate-200 opacity-0 hover:opacity-100 transition">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="flex-1 p-2 text-indigo-600 hover:bg-indigo-50 rounded transition flex items-center justify-center gap-1 text-sm"
                          >
                            <Pencil size={14} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="flex-1 p-2 text-rose-600 hover:bg-rose-50 rounded transition flex items-center justify-center gap-1 text-sm"
                          >
                            <Trash size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
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
