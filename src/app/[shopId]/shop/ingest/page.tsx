'use client';

/**
 * /[shopId]/shop/ingest
 * ─────────────────────────────────────────────────────────────────────────────
 * AI-assisted product ingestion from shelf/product photos.
 * Upload 5-10 images → AI detects products → review → save to shop.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef } from 'react';
import { useShop } from '@/lib/shop-context';
import {
  Upload, X, CheckCircle, AlertCircle, Loader2,
  Package, ChevronDown, ChevronUp, ArrowLeft,
  ImageIcon, Sparkles, Save, SkipForward, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DetectedProduct {
  name: string;
  localName?: string;
  brand?: string;
  variant?: string;
  category?: string;
  estimatedPrice?: number;
  imageUrl?: string;
  imageSource?: 'global_catalog' | 'open_food_facts' | 'none';
  globalCatalogId?: string;
  isDuplicate?: boolean;
  confidence: 'high' | 'medium' | 'low';
}

interface ReviewProduct extends DetectedProduct {
  // Editable fields
  editName: string;
  editLocalName: string;
  editCategory: string;
  editPrice: string;
  editUnit: string;
  selected: boolean;   // whether to save this product
  expanded: boolean;   // show edit fields
}

interface ImageJob {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
  products: DetectedProduct[];
}

const CATEGORIES = [
  'Snacks', 'Beverages', 'Dairy', 'Grains & Pulses', 'Spices',
  'Personal Care', 'Household', 'Confectionery', 'Bakery', 'Frozen', 'Other',
];

const UNITS = ['pc', 'kg', 'g', 'l', 'ml'];

// ── Component ─────────────────────────────────────────────────────────────────
export default function IngestPage() {
  const { shop, shopId, loading } = useShop();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const [reviewProducts, setReviewProducts] = useState<ReviewProduct[]>([]);
  const [phase, setPhase] = useState<'upload' | 'processing' | 'review' | 'saving' | 'done'>('upload');
  const [saveResult, setSaveResult] = useState<any>(null);
  const [processingIdx, setProcessingIdx] = useState(0);

  if (loading) return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading…</div>;

  // ── File selection ──────────────────────────────────────────────────────────
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newJobs: ImageJob[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, 10) // max 10 at once
      .map(file => ({
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
        status: 'pending',
        products: [],
      }));
    setJobs(prev => [...prev, ...newJobs].slice(0, 10));
  };

  const removeJob = (id: string) => setJobs(prev => prev.filter(j => j.id !== id));

  // ── Process all images ──────────────────────────────────────────────────────
  const processAll = async () => {
    const pendingJobs = jobs.filter(j => j.status === 'pending');
    if (pendingJobs.length === 0) return;

    setPhase('processing');
    setProcessingIdx(0);

    const allDetected: DetectedProduct[] = [];

    for (let i = 0; i < pendingJobs.length; i++) {
      const job = pendingJobs[i];
      setProcessingIdx(i + 1);

      // Update job status
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'processing' } : j));

      try {
        // Compress image to base64
        const base64 = await fileToBase64(job.file);

        const res = await fetch('/api/products/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, shopId }),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Processing failed');

        const products: DetectedProduct[] = data.products || [];

        setJobs(prev => prev.map(j =>
          j.id === job.id ? { ...j, status: 'done', products } : j
        ));

        allDetected.push(...products);

      } catch (err: any) {
        setJobs(prev => prev.map(j =>
          j.id === job.id ? { ...j, status: 'error', error: err.message } : j
        ));
      }
    }

    // Deduplicate across all images by name
    const seen = new Set<string>();
    const deduped = allDetected.filter(p => {
      const key = p.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Build review list
    const reviewList: ReviewProduct[] = deduped.map(p => ({
      ...p,
      editName: p.name,
      editLocalName: p.localName || '',
      editCategory: p.category || 'Other',
      editPrice: p.estimatedPrice ? String(p.estimatedPrice) : '',
      editUnit: 'pc',
      selected: !p.isDuplicate, // auto-deselect duplicates
      expanded: false,
    }));

    setReviewProducts(reviewList);
    setPhase('review');
  };

  // ── Save confirmed products ─────────────────────────────────────────────────
  const saveProducts = async () => {
    const toSave = reviewProducts
      .filter(p => p.selected && !p.isDuplicate)
      .map(p => ({
        name: p.editName.trim(),
        localName: p.editLocalName.trim() || undefined,
        brand: p.brand,
        variant: p.variant,
        category: p.editCategory,
        price: parseFloat(p.editPrice) || 0,
        baseUnit: p.editUnit,
        imageUrl: p.imageUrl,
        globalCatalogId: p.globalCatalogId,
      }));

    if (toSave.length === 0) return;

    setPhase('saving');

    const res = await fetch('/api/products/ingest/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId, products: toSave }),
    });

    const result = await res.json();
    setSaveResult(result);
    setPhase('done');
  };

  const reset = () => {
    setJobs([]);
    setReviewProducts([]);
    setPhase('upload');
    setSaveResult(null);
    setProcessingIdx(0);
  };

  const updateReview = (idx: number, field: keyof ReviewProduct, value: any) => {
    setReviewProducts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const selectedCount = reviewProducts.filter(p => p.selected && !p.isDuplicate).length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/${shopId}/products`} className="text-slate-400 hover:text-slate-600 transition">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="text-indigo-500" size={24} />
            AI Product Ingest
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Upload shelf photos → AI detects products → review → save to <strong>{shop?.name}</strong>
          </p>
        </div>
      </div>

      {/* ── Phase: Upload ── */}
      {phase === 'upload' && (
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            className="border-2 border-dashed border-indigo-200 rounded-2xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 transition-all"
          >
            <Upload size={36} className="mx-auto text-indigo-300 mb-3" />
            <p className="font-semibold text-slate-700">Drop shelf/product photos here</p>
            <p className="text-sm text-slate-400 mt-1">or tap to select · up to 10 images at once</p>
            <p className="text-xs text-slate-300 mt-2">JPG, PNG, WEBP supported</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />

          {/* Image previews */}
          {jobs.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {jobs.map(job => (
                <div key={job.id} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={job.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeJob(job.id)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {/* Add more */}
              {jobs.length < 10 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:border-indigo-300 hover:text-indigo-400 transition"
                >
                  <Upload size={20} />
                </button>
              )}
            </div>
          )}

          {jobs.length > 0 && (
            <button
              onClick={processAll}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition shadow-md"
            >
              <Sparkles size={18} />
              Detect Products from {jobs.length} Image{jobs.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* ── Phase: Processing ── */}
      {phase === 'processing' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-center">
            <Loader2 size={36} className="mx-auto text-indigo-500 animate-spin mb-3" />
            <p className="font-bold text-slate-800">Processing image {processingIdx} of {jobs.filter(j => j.status !== 'pending' || processingIdx > 0).length}…</p>
            <p className="text-sm text-slate-500 mt-1">AI is detecting products and fetching images</p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {jobs.map(job => (
              <div key={job.id} className="relative rounded-xl overflow-hidden border aspect-square bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={job.preview} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  {job.status === 'processing' && <Loader2 size={20} className="text-white animate-spin" />}
                  {job.status === 'done' && <CheckCircle size={20} className="text-emerald-400" />}
                  {job.status === 'error' && <AlertCircle size={20} className="text-rose-400" />}
                  {job.status === 'pending' && <div className="w-4 h-4 rounded-full bg-white/40" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Phase: Review ── */}
      {phase === 'review' && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-wrap gap-4 shadow-sm">
            <Stat label="Detected" value={reviewProducts.length} color="indigo" />
            <Stat label="New" value={reviewProducts.filter(p => !p.isDuplicate).length} color="emerald" />
            <Stat label="Duplicates" value={reviewProducts.filter(p => p.isDuplicate).length} color="amber" />
            <Stat label="With Images" value={reviewProducts.filter(p => p.imageUrl).length} color="sky" />
            <Stat label="Selected" value={selectedCount} color="violet" />
          </div>

          <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
            Review detected products. Edit names/prices, deselect any you don't want, then tap Save.
            Duplicates (already in your shop) are deselected automatically.
          </p>

          {/* Product review cards */}
          <div className="space-y-2">
            {reviewProducts.map((p, idx) => (
              <div
                key={idx}
                className={`rounded-2xl border overflow-hidden transition-all ${
                  p.isDuplicate
                    ? 'border-amber-200 bg-amber-50/30 opacity-70'
                    : p.selected
                    ? 'border-indigo-200 bg-white shadow-sm'
                    : 'border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                {/* Card header */}
                <div className="flex items-center gap-3 p-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => !p.isDuplicate && updateReview(idx, 'selected', !p.selected)}
                    disabled={p.isDuplicate}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
                      p.isDuplicate
                        ? 'border-amber-300 bg-amber-100 cursor-not-allowed'
                        : p.selected
                        ? 'border-indigo-600 bg-indigo-600'
                        : 'border-slate-300'
                    }`}
                  >
                    {(p.selected || p.isDuplicate) && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>

                  {/* Product image */}
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={16} className="text-slate-300" />
                      </div>
                    )}
                  </div>

                  {/* Name + badges */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{p.editName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-slate-400">{p.editCategory}</span>
                      {p.isDuplicate && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">Already in shop</span>
                      )}
                      {p.imageSource === 'open_food_facts' && (
                        <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">OFF image</span>
                      )}
                      {p.imageSource === 'global_catalog' && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Catalog image</span>
                      )}
                      <ConfidenceBadge confidence={p.confidence} />
                    </div>
                  </div>

                  {/* Price */}
                  {p.editPrice && (
                    <span className="text-sm font-bold text-indigo-600 flex-shrink-0">₹{p.editPrice}</span>
                  )}

                  {/* Expand toggle */}
                  <button
                    onClick={() => updateReview(idx, 'expanded', !p.expanded)}
                    className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                  >
                    {p.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Expanded edit fields */}
                {p.expanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3 bg-white">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Product Name</label>
                        <input
                          type="text"
                          value={p.editName}
                          onChange={e => updateReview(idx, 'editName', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Hindi Name</label>
                        <input
                          type="text"
                          value={p.editLocalName}
                          onChange={e => updateReview(idx, 'editLocalName', e.target.value)}
                          placeholder="Optional"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Category</label>
                        <select
                          value={p.editCategory}
                          onChange={e => updateReview(idx, 'editCategory', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Unit</label>
                        <select
                          value={p.editUnit}
                          onChange={e => updateReview(idx, 'editUnit', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                        >
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Selling Price (₹)</label>
                        <input
                          type="number"
                          value={p.editPrice}
                          onChange={e => updateReview(idx, 'editPrice', e.target.value)}
                          placeholder="0"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Image URL</label>
                        <input
                          type="text"
                          value={p.imageUrl || ''}
                          onChange={e => updateReview(idx, 'imageUrl', e.target.value)}
                          placeholder="https://…"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
                    </div>
                    {p.brand && <p className="text-xs text-slate-400">Brand: {p.brand}{p.variant ? ` · ${p.variant}` : ''}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action bar */}
          <div className="flex gap-3 sticky bottom-4">
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
            >
              <RefreshCw size={15} /> Start Over
            </button>
            <button
              onClick={saveProducts}
              disabled={selectedCount === 0}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition shadow-md"
            >
              <Save size={18} />
              Save {selectedCount} Product{selectedCount !== 1 ? 's' : ''} to Shop
            </button>
          </div>
        </div>
      )}

      {/* ── Phase: Saving ── */}
      {phase === 'saving' && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-10 text-center">
          <Loader2 size={36} className="mx-auto text-indigo-500 animate-spin mb-3" />
          <p className="font-bold text-slate-800">Saving products…</p>
          <p className="text-sm text-slate-500 mt-1">Adding to your shop and global catalog</p>
        </div>
      )}

      {/* ── Phase: Done ── */}
      {phase === 'done' && saveResult && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <CheckCircle size={40} className="mx-auto text-emerald-500 mb-3" />
            <p className="font-bold text-slate-900 text-lg">
              {saveResult.saved} product{saveResult.saved !== 1 ? 's' : ''} saved!
            </p>
            {saveResult.skipped > 0 && (
              <p className="text-sm text-slate-500 mt-1">{saveResult.skipped} skipped (already in shop)</p>
            )}
            {saveResult.errors > 0 && (
              <p className="text-sm text-rose-500 mt-1">{saveResult.errors} failed to save</p>
            )}
          </div>

          {saveResult.savedNames?.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Saved Products</p>
              <div className="flex flex-wrap gap-2">
                {saveResult.savedNames.map((name: string) => (
                  <span key={name} className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              <Upload size={16} /> Ingest More Images
            </button>
            <Link
              href={`/${shopId}/products`}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
            >
              <Package size={16} /> View Products
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    sky: 'bg-sky-50 text-sky-700',
    violet: 'bg-violet-50 text-violet-700',
  };
  return (
    <div className={`flex flex-col items-center px-3 py-1.5 rounded-xl ${colors[color] || colors.indigo}`}>
      <span className="text-lg font-bold leading-none">{value}</span>
      <span className="text-[10px] font-medium mt-0.5">{label}</span>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: string }) {
  if (confidence === 'high') return <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">High</span>;
  if (confidence === 'medium') return <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Medium</span>;
  return <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full">Low</span>;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Compress if large
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 1024;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
