'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Package, Camera, Sparkles, Upload, Trash, X } from 'lucide-react';

const standardCategories = [
  'Grains & Cereals',
  'Pulses & Dals',
  'Spices & Seasonings',
  'Oils & Ghee',
  'Dairy & Milk Products',
  'Beverages',
  'Snacks & Confectionery',
  'Instant Foods & Noodles',
  'Personal Care & Hygiene',
  'Household Cleaning',
  'Miscellaneous'
];


export default function ProductEditor({ product, products, shop, onClose, onSaved }: { product: any | null; products: any[]; shop: any; onClose: () => void; onSaved: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', localName: '', barcode: '',
    sellingPrice: '', costPrice: '', unit: 'pc', category: '', imageUrl: '',
    packetWeight: '', packetUnit: 'g', localAliases: ''
  });

  // Category select dropdown state
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // AI autofill states
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);


const setIsModalOpen = (open: boolean) => { if (!open) onClose(); };
const mergedCategories = Array.from(new Set([...standardCategories, ...products.map(p => p.category).filter(Boolean)])).sort() as string[];
  const resetForm = () => {
    setFormError(null);
    setFormData({ name: '', localName: '', barcode: '', sellingPrice: '', costPrice: '', unit: 'pc', category: '', imageUrl: '', packetWeight: '', packetUnit: 'g', localAliases: '' });
    setEditingId(null);
    setImagePreview(null);
    setAiFields(new Set());
    setAnalyzeError(null);
    setIsCustomCategory(false);
  };

  // Step 1: Compress image to base64 JPEG (max 800px)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new window.Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX = 800;
          let w = img.width, h = img.height;
          if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
      };
    });
  };

  // Step 2: Compose product on Amazon-style white square background
  // Product centered with 10% padding, white background, 600x600px
  const composeProductImage = (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const SIZE = 600;
        const PADDING = SIZE * 0.10; // 10% padding on each side
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d')!;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, SIZE, SIZE);

        // Scale product to fit within padded area, maintaining aspect ratio
        const maxW = SIZE - PADDING * 2;
        const maxH = SIZE - PADDING * 2;
        const scale = Math.min(maxW / img.width, maxH / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const x = (SIZE - drawW) / 2;
        const y = (SIZE - drawH) / 2;

        ctx.drawImage(img, x, y, drawW, drawH);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.onerror = () => {
        // Fallback to original image if composition fails
        resolve(base64);
      };
      img.src = base64;
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzeError(null);

    // Show raw preview instantly
    const compressed = await compressImage(file);
    setImagePreview(compressed);
    setFormData(prev => ({ ...prev, imageUrl: compressed }));

    // Run both in parallel: AI analysis + background removal
    setIsAnalyzing(true);
    try {
      const [aiRes, bgRes] = await Promise.allSettled([
        // AI analysis
        fetch('/api/products/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: compressed })
        }).then(async r => {
          const data = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(data.error || 'AI analysis failed');
          return data;
        }),

        // Background removal
        fetch('/api/products/process-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: compressed })
        }).then(async r => {
          const data = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(data.error || 'Background removal failed');
          return data;
        }),
      ]);

      // Apply background removal result safely
      if (bgRes.status === 'fulfilled' && bgRes.value && !bgRes.value.error && bgRes.value.imageBase64) {
        try {
          const cleanImage = await composeProductImage(bgRes.value.imageBase64);
          setImagePreview(cleanImage);
          setFormData(prev => ({ ...prev, imageUrl: cleanImage }));
        } catch (err) {
          console.error("Failed to compose background-removed image, keeping raw:", err);
        }
      }

      // Apply AI autofill safely
      if (aiRes.status === 'fulfilled' && aiRes.value && !aiRes.value.error) {
        const data = aiRes.value;
        const filled = new Set<string>();
        setFormData(prev => {
          const next = { ...prev };
          if (data.name)      { next.name = data.name;           filled.add('name'); }
          if (data.localName) { next.localName = data.localName; filled.add('localName'); }
          if (data.category)  {
            next.category = data.category;
            filled.add('category');
            const isCustom = data.category && !mergedCategories.includes(data.category);
            setIsCustomCategory(!!isCustom);
          }
          if (data.unit)      { next.unit = data.unit;           filled.add('unit'); }
          return next;
        });
        setAiFields(filled);
      } else if (aiRes.status === 'fulfilled' && aiRes.value?.error) {
        setAnalyzeError(aiRes.value.error);
      } else if (aiRes.status === 'rejected') {
        console.warn('AI analysis rejected:', aiRes.reason);
        setAnalyzeError(aiRes.reason?.message || 'AI analysis failed.');
      }
    } catch (err: any) {
      setAnalyzeError('Could not connect to AI. Fill manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOpenEdit = (p: any) => {
    resetForm();
    const isCustom = p.category && !mergedCategories.includes(p.category);
    setIsCustomCategory(!!isCustom);
    setFormData({
      name: p.name, localName: p.localName || '', barcode: p.barcode || '',
      sellingPrice: p.price ? p.price.toString() : (p.sellingPrice?.toString() || ''), costPrice: p.costPrice ? p.costPrice.toString() : '',
      unit: p.baseUnit || p.unit, category: p.category || '', imageUrl: p.imageUrl || '',
      packetWeight: p.packetWeight ? p.packetWeight.toString() : '', packetUnit: p.packetUnit || 'g',
      localAliases: Array.isArray(p.localAliases) ? p.localAliases.join(', ') : ''
    });
    setEditingId(p.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    setDeleting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete the product. Please try again.');
      setIsModalOpen(false);
      resetForm();
      await onSaved();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not delete the product. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const aliasesArray = formData.localAliases
      ? formData.localAliases.split(',').map(s => s.trim()).filter(s => s.length > 0)
      : [];

    const payload = {
      ...formData,
      localAliases: aliasesArray.length > 0 ? aliasesArray : undefined,
      shopId: shop.id
    };
    const url = editingId ? `/api/products/${editingId}` : '/api/products';
    const method = editingId ? 'PUT' : 'POST';

    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Could not save the product. Please try again.');
      setIsModalOpen(false);
      resetForm();
      await onSaved();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save the product. Please try again.');
    } finally {
      setSaving(false);
    }
  };


useEffect(() => { if (product) handleOpenEdit(product); }, []);
return createPortal((
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center sm:p-6">
          <div role="dialog" aria-modal="true" aria-labelledby="product-editor-title" className="bg-slate-50 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[95dvh] sm:max-h-[90dvh] flex flex-col">
            <div className="px-5 sm:px-7 py-5 border-b border-slate-200/70 bg-white flex justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Package size={22} /></div>
                <div><h2 id="product-editor-title" className="text-lg font-bold text-slate-900">{editingId ? 'Edit product' : 'New product'}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{editingId ? 'Keep your product details up to date.' : 'Add a new item to your catalog.'}</p></div>
              </div>
              <button disabled={saving || deleting} aria-label="Close product editor" onClick={() => setIsModalOpen(false)} className="text-slate-500 bg-slate-100 hover:bg-slate-200 p-2 rounded-full disabled:opacity-50"><X size={20} /></button>
            </div>

            <form id="product-editor-form" onSubmit={handleSubmit} className="p-4 sm:p-7 overflow-y-auto space-y-5">
              <fieldset disabled={saving || deleting} className="space-y-5 min-w-0">

              {/* ── Image Section ── */}
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Camera size={16} className="text-indigo-500" />
                  <span className="text-sm font-bold text-indigo-700">Product Image {!editingId && '& AI Auto-fill'}</span>
                  {!editingId && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">BETA</span>}
                </div>

                <div className="flex gap-3 items-start">
                    {/* Preview */}
                    <div
                      className="w-24 h-24 rounded-xl border-2 border-indigo-200 bg-white overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:border-indigo-400 transition"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      {imagePreview || formData.imageUrl
                        ? <img src={imagePreview || formData.imageUrl} alt="preview" className="w-full h-full object-contain" />
                        : <div className="flex flex-col items-center gap-1 text-indigo-300">
                            <Camera size={24} />
                            <span className="text-[10px] font-medium">Tap to add</span>
                          </div>
                      }
                    </div>

                    <div className="flex-1">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleImageSelect}
                      />
                      <div className="flex gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => { if (imageInputRef.current) { imageInputRef.current.removeAttribute('capture'); imageInputRef.current.click(); } }}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-indigo-300 text-indigo-600 rounded-xl py-2 text-xs font-semibold hover:bg-indigo-50 transition"
                        >
                          <Upload size={13} /> Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => { if (imageInputRef.current) { imageInputRef.current.setAttribute('capture', 'environment'); imageInputRef.current.click(); } }}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white rounded-xl py-2 text-xs font-semibold hover:bg-indigo-700 transition"
                        >
                          <Camera size={13} /> Camera
                        </button>
                      </div>

                      {isAnalyzing && (
                        <div className="flex items-center gap-2 text-indigo-600 text-xs font-medium">
                          <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                          Removing background + analyzing with AI…
                        </div>
                      )}
                      {analyzeError && (
                        <p className="text-xs text-rose-500">{analyzeError}</p>
                      )}
                      {!isAnalyzing && !analyzeError && aiFields.size > 0 && (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                          <Sparkles size={12} />
                          AI filled {aiFields.size} field{aiFields.size > 1 ? 's' : ''} — review before saving
                        </div>
                      )}
                      {!imagePreview && !formData.imageUrl && !isAnalyzing && (
                        <p className="text-[11px] text-slate-400 mt-1">Take a photo of the product packaging to auto-fill name, category & unit</p>
                      )}
                    </div>
                  </div>
                </div>

              {/* ── Form Fields ── */}
              <div><h3 className="text-sm font-bold text-slate-900">Product details</h3><p className="text-xs text-slate-500 mt-1">Name, pricing and category. Required fields are marked *.</p></div>
              <div className="grid md:grid-cols-2 gap-5 rounded-2xl bg-white border border-slate-200/70 p-4 sm:p-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                    Name *
                    {aiFields.has('name') && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"><Sparkles size={9} />AI</span>}
                  </label>
                  <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full border rounded-xl bg-slate-50/70 px-3 py-3 text-sm transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500 ${aiFields.has('name') ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}`}
                    placeholder="e.g. Tata Salt 1kg" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                    Local/Hindi Name
                    {aiFields.has('localName') && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"><Sparkles size={9} />AI</span>}
                  </label>
                  <input value={formData.localName} onChange={e => setFormData({ ...formData, localName: e.target.value })}
                    className={`w-full border rounded-xl bg-slate-50/70 px-3 py-3 text-sm transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500 ${aiFields.has('localName') ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}`}
                    placeholder="e.g. टाटा नमक" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Selling Price (₹) *</label>
                  <input required type="number" step="0.01" value={formData.sellingPrice} onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl bg-slate-50/70 px-3 py-3 text-sm transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Cost Price (₹)</label>
                  <input type="number" step="0.01" value={formData.costPrice} onChange={e => setFormData({ ...formData, costPrice: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl bg-slate-50/70 px-3 py-3 text-sm transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                    Unit Type *
                    {aiFields.has('unit') && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"><Sparkles size={9} />AI</span>}
                  </label>
                  <select required value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className={`w-full border rounded-xl bg-slate-50/70 px-3 py-3 text-sm transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${aiFields.has('unit') ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}`}>
                    <option value="pc">Piece (pc)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="pkt">Packet (pkt)</option>
                    <option value="ltr">Liter (ltr)</option>
                    <option value="g">Gram (g)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                    Category
                    {aiFields.has('category') && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"><Sparkles size={9} />AI</span>}
                  </label>
                  <select
                    value={isCustomCategory ? '__custom__' : formData.category}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        setIsCustomCategory(true);
                        setFormData(prev => ({ ...prev, category: '' }));
                      } else {
                        setIsCustomCategory(false);
                        setFormData(prev => ({ ...prev, category: val }));
                      }
                    }}
                    className={`w-full border rounded-xl bg-slate-50/70 px-3 py-3 text-sm transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${aiFields.has('category') ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'}`}
                  >
                    <option value="">Select Category</option>
                    {mergedCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="__custom__">➕ Other / Add Custom Category...</option>
                  </select>
                  {isCustomCategory && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={formData.category}
                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                        placeholder="Type custom category name..."
                        className="w-full border border-slate-200 rounded-xl bg-slate-50/70 px-3 py-3 text-sm transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                      />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Barcode</label>
                  <input value={formData.barcode} onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl bg-slate-50/70 px-3 py-3 text-sm transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                    placeholder="Scan or type barcode" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-600 mb-2">
                    Hindi Local Name Aliases (Comma-separated)
                  </label>
                  <input value={formData.localAliases}
                    onChange={e => setFormData({ ...formData, localAliases: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl bg-slate-50/70 px-3 py-3 text-sm transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-500"
                    placeholder="e.g. लक्स साबुन, लक्स सोप, लक्स ब्यूटी सोप (Separated by commas)" />
                  <p className="text-[11px] text-slate-400 mt-1">
                    These are short names and variations used by customers to find products via voice search. Leave blank to auto-generate if name/local name is updated.
                  </p>
                </div>
              </div>

              {/* Packet fields */}
              {formData.unit === 'pkt' && (
                <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-2">Packet Weight/Volume *</label>
                    <input type="number" step="0.01" value={formData.packetWeight} onChange={e => setFormData({ ...formData, packetWeight: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl bg-slate-50/70 px-3 py-3 text-sm transition focus:bg-white placeholder-slate-500" placeholder="e.g. 84" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-2">Packet Unit *</label>
                    <select value={formData.packetUnit} onChange={e => setFormData({ ...formData, packetUnit: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl bg-slate-50/70 px-3 py-3 text-sm transition focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                      <option value="">Select unit</option>
                      <option value="g">Gram (g)</option>
                      <option value="ml">Milliliter (ml)</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="ltr">Liter (ltr)</option>
                    </select>
                  </div>
                </div>
              )}

              {editingId && (
                <div className="rounded-2xl border border-rose-100 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
                  <div><h3 className="text-sm font-semibold text-slate-800">Remove product</h3><p className="text-xs text-slate-500 mt-1">Permanently remove this item from your catalog.</p></div>
                  <button type="button" onClick={() => handleDelete(editingId)} disabled={saving || deleting || isAnalyzing} className="inline-flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 disabled:opacity-50 transition"><Trash size={14} />{deleting ? 'Deleting…' : 'Delete product'}</button>
                </div>
              )}
              </fieldset>
            </form>
            <div className="shrink-0 bg-white border-t border-slate-200/70 px-5 sm:px-7 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {formError && <p role="alert" className="text-sm text-rose-600 mb-3">{formError}</p>}
              <div className="flex items-center justify-end gap-3">
                <button type="button" disabled={saving || deleting} onClick={() => setIsModalOpen(false)} className="px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition disabled:opacity-50">Cancel</button>
                <button type="submit" form="product-editor-form" disabled={isAnalyzing || saving || deleting} className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition shadow-sm shadow-indigo-200 disabled:opacity-50">{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add product'}</button>
              </div>
            </div>
          </div>
        </div>
), document.body);
}
