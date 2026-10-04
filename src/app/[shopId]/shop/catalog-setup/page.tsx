'use client';

/**
 * /[shopId]/shop/catalog-setup
 * ─────────────────────────────────────────────────────────────────────────────
 * Global Catalog Import Page
 *
 * Shows ALL unique products from across all shops + globalCatalog collection,
 * deduplicated by name, grouped by category — exactly like the billing page.
 *
 * Import modes:
 *   • Import All          — one click, imports everything not already in shop
 *   • Import by Category  — click a category header checkbox
 *   • Import by Product   — tap individual product cards
 *
 * Products already in the shop are shown as "Already Added" and are not
 * selectable (prevents duplicates).
 *
 * Each import creates a fully independent copy in the shop's products
 * collection — editing or deleting it never affects the global catalog.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useShop } from '@/lib/shop-context';
import {
  Package, Search, ArrowLeft, Plus,
  Check, Loader2, RefreshCw, ShoppingBag, CheckSquare, Square,
} from 'lucide-react';
import Link from 'next/link';
import { useHindi, CATEGORY_IMAGES } from '@/lib/hindi-context';
import { formatProductPackSize } from '@/lib/bill-utils';

interface CatalogProduct {
  id: string;
  name: string;
  localName?: string | null;
  category?: string | null;
  price?: number;
  baseUnit?: string;
  imageUrl?: string | null;
  [key: string]: any;
}

export default function CatalogSetupPage() {
  const router = useRouter();
  const { pName, catName } = useHindi();
  const { shop, shopId, loading: shopLoading } = useShop();

  // ── Data ──────────────────────────────────────────────────────────────────
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [shopProductNames, setShopProductNames] = useState<Set<string>>(new Set());
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [loadingShopProducts, setLoadingShopProducts] = useState(true);

  // ── Selection ─────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set()); // product IDs

  // ── UI state ──────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);

  // ── Load catalog ──────────────────────────────────────────────────────────
  const loadCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const res = await fetch('/api/global-catalog');
      if (res.ok) {
        const data: CatalogProduct[] = await res.json();
        setCatalog(data);

      }
    } catch {}
    setLoadingCatalog(false);
  };

  // ── Load this shop's existing products ────────────────────────────────────
  const loadShopProducts = async () => {
    if (!shopId) return;
    setLoadingShopProducts(true);
    try {
      const res = await fetch(`/api/products?shopId=${shopId}`);
      if (res.ok) {
        const data = await res.json();
        setShopProductNames(
          new Set(data.map((p: any) => (p.name || '').toLowerCase().trim()))
        );
      }
    } catch {}
    setLoadingShopProducts(false);
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    if (shopId) loadShopProducts();
  }, [shopId]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const isAlreadyAdded = (p: CatalogProduct) =>
    shopProductNames.has((p.name || '').toLowerCase().trim());

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return catalog;
    const q = search.toLowerCase();
    return catalog.filter(
      p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.localName || '').toLowerCase().includes(q)
    );
  }, [catalog, search]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, CatalogProduct[]>();
    for (const p of filtered) {
      const cat = p.category || 'Uncategorized';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    // Sort categories alphabetically, Uncategorized last
    return new Map(
      [...map.entries()].sort(([a], [b]) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
      })
    );
  }, [filtered]);

  const categories = Array.from(grouped.keys());

  // Selectable products (not already in shop)
  const selectableInCategory = (cat: string) =>
    (grouped.get(cat) || []).filter(p => !isAlreadyAdded(p));

  const allSelectableProducts = catalog.filter(p => !isAlreadyAdded(p));
  const allSelectableInFiltered = filtered.filter(p => !isAlreadyAdded(p) && (!activeCategory || (p.category || 'Uncategorized') === activeCategory));

  // ── Selection helpers ─────────────────────────────────────────────────────
  const toggleProduct = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleCategory = (cat: string) => {
    const selectable = selectableInCategory(cat);
    const allSelected = selectable.every(p => selected.has(p.id));
    setSelected(prev => {
      const n = new Set(prev);
      if (allSelected) {
        selectable.forEach(p => n.delete(p.id));
      } else {
        selectable.forEach(p => n.add(p.id));
      }
      return n;
    });
  };

  const toggleAll = () => {
    const allSelected = allSelectableInFiltered.every(p => selected.has(p.id));
    setSelected(prev => {
      const n = new Set(prev);
      if (allSelected) {
        allSelectableInFiltered.forEach(p => n.delete(p.id));
      } else {
        allSelectableInFiltered.forEach(p => n.add(p.id));
      }
      return n;
    });
  };

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    setImportResult(null);

    const productsToImport = catalog.filter(p => selected.has(p.id));

    try {
      const res = await fetch('/api/global-catalog/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, products: productsToImport }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult({ imported: data.imported, skipped: data.skipped });
        setSelected(new Set());
        // Refresh shop products so newly imported ones show as "Already Added"
        await loadShopProducts();
      } else {
        alert('Import failed: ' + (data.error || 'Unknown error'));
      }
    } catch {
      alert('Network error during import');
    }
    setImporting(false);
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  const isLoading = loadingCatalog || loadingShopProducts || shopLoading;

  const totalSelectable = allSelectableProducts.length;
  const totalAlreadyAdded = catalog.filter(p => isAlreadyAdded(p)).length;
  const allFilteredSelected =
    allSelectableInFiltered.length > 0 &&
    allSelectableInFiltered.every(p => selected.has(p.id));

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          {/* Back + title */}
          <div className="flex items-center gap-3 mb-3">
            <Link
              href={`/${shopId}/shop/setup`}
              className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 text-sm font-medium transition"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Shop Setup</span>
            </Link>
            <span className="text-slate-300">/</span>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Package size={20} className="text-indigo-600" />
              Import Catalog
            </h1>
          </div>

          {/* Stats row */}
          {!isLoading && (
            <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
              <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-semibold">
                {catalog.length} total products
              </span>
              <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">
                {totalAlreadyAdded} already in your shop
              </span>
              <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-semibold">
                {totalSelectable} available to import
              </span>
              {selected.size > 0 && (
                <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-semibold">
                  {selected.size} selected
                </span>
              )}
            </div>
          )}

          {/* Search + select all */}
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                aria-label="Search catalog"
                placeholder="Search products or Hindi names…"
                value={search}
                onChange={e => { setSearch(e.target.value); setActiveCategory(null); }}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
              />
            </div>
            {/* Select all visible */}
            {!isLoading && allSelectableInFiltered.length > 0 && (
              <button
                onClick={toggleAll}
                disabled={importing}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition whitespace-nowrap ${
                  allFilteredSelected
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {allFilteredSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                {allFilteredSelected ? 'Deselect All' : 'Select All'}
              </button>
            )}
            <button
              disabled={importing || isLoading}
              onClick={() => { loadCatalog(); loadShopProducts(); }}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition"
              title="Refresh catalog"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 pb-32">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 size={32} className="animate-spin text-indigo-400" />
            <p className="text-sm">Loading catalog…</p>
          </div>
        ) : catalog.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <Package size={40} className="opacity-30" />
            <p className="font-medium">No products in catalog yet.</p>
            <p className="text-sm text-center max-w-xs">
              Products will appear here once they are available in the shared catalog.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2 text-slate-400">
            <Search size={32} className="opacity-30" />
            <p className="font-medium">No products match "{search}"</p>
          </div>
        ) : (
          /* Import result banner */
          <>
            {importResult && (
              <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                  <Check size={16} />
                  Imported {importResult.imported} products
                  {importResult.skipped > 0 && (
                    <span className="text-emerald-500 font-normal">
                      ({importResult.skipped} already existed)
                    </span>
                  )}
                </div>
                <button
                  onClick={() => router.push(`/${shopId}/billing`)}
                  className="text-xs text-emerald-700 font-bold hover:underline"
                >
                  View in Billing →
                </button>
              </div>
            )}

            {!activeCategory && !search.trim() ? (
              <section className="rounded-2xl bg-gradient-to-b from-indigo-50 via-violet-50 to-slate-50 px-4 pt-4 pb-6">
                <div className="mb-4"><h2 className="text-sm font-bold text-slate-900">Browse by category</h2><p className="mt-1 text-xs text-slate-500">Choose products for your shop. Select a whole category or pick items individually.</p></div>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {categories.map(cat => {
                    const products = grouped.get(cat) || [];
                    const available = selectableInCategory(cat);
                    const count = available.filter(p => selected.has(p.id)).length;
                    const image = CATEGORY_IMAGES[cat] || products.find(p => p.imageUrl)?.imageUrl;
                    return <div key={cat} className={`min-w-0 rounded-2xl border transition ${count ? 'border-indigo-300 bg-white shadow-sm' : 'border-white/80 bg-white/70'}`}>
                      <button onClick={() => setActiveCategory(cat)} className="flex w-full flex-col items-center gap-2 px-2 pt-4 pb-3 rounded-2xl hover:bg-white transition focus-visible:outline-indigo-500">
                        <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 ring-2 ring-indigo-100 shadow-sm">
                          <Package size={26} className="text-indigo-400" />
                          {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />}
                        </div>
                        <div className="text-center"><p className="text-xs font-bold leading-tight text-slate-800 line-clamp-2">{catName(cat)}</p><p className="mt-1 text-[10px] text-slate-400">{products.length} items · {available.length} new</p></div>
                      </button>
                      <button disabled={!available.length || importing} onClick={() => toggleCategory(cat)} aria-pressed={available.length > 0 && count === available.length} className="flex w-full items-center justify-center gap-1 border-t border-indigo-50 px-1 py-2 text-[10px] font-semibold text-indigo-600 disabled:text-slate-400 hover:bg-indigo-50 rounded-b-2xl">
                        {count > 0 ? <CheckSquare size={12} /> : <Plus size={12} />}{!available.length ? 'Already added' : count === available.length ? 'Selected' : count ? count + ' selected' : 'Select category'}
                      </button>
                    </div>;
                  })}
                </div>
              </section>
            ) : (
              <div>
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                  <button onClick={() => { setActiveCategory(null); setSearch(''); }} aria-label="Back to categories" className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"><ArrowLeft size={16} /></button>
                  <div className="min-w-0"><h2 className="text-base font-bold text-slate-900">{activeCategory ? catName(activeCategory) : 'Search results'}</h2><p className="text-xs text-slate-400">{activeCategory ? grouped.get(activeCategory)?.length || 0 : filtered.length} products · {allSelectableInFiltered.length} available</p></div>
                </div>
                {(activeCategory ? [activeCategory] : categories).map(cat => <section key={cat} className="mb-5">
                  {!activeCategory && <div className="flex justify-between gap-3 mb-3"><h3 className="text-sm font-semibold text-slate-700">{catName(cat)}</h3><button disabled={importing} onClick={() => toggleCategory(cat)} className="text-xs text-indigo-600 font-semibold">Select category</button></div>}
                  <div className="grid grid-cols-3 gap-3">
                    {(grouped.get(cat) || []).map(p => {
                      const added = isAlreadyAdded(p); const isSelected = selected.has(p.id);
                      return <button key={p.id} disabled={added || importing} aria-pressed={isSelected} aria-label={`${added ? 'Already added' : isSelected ? 'Deselect' : 'Select'} ${pName(p.name, p.localName)}`} onClick={() => toggleProduct(p.id)} className={`relative min-w-0 overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all focus-visible:outline-indigo-500 ${added ? 'border-emerald-200' : isSelected ? 'border-indigo-400 shadow-indigo-100 ring-1 ring-indigo-400' : 'border-slate-200 hover:shadow-md active:scale-[0.98]'}`}>
                        <div className="relative w-full aspect-square bg-slate-100">
                          <div className="absolute inset-0 flex items-center justify-center"><Package size={28} className="text-slate-300" /></div>
                          {p.imageUrl && <img src={p.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none'; }} />}
                          {isSelected && <div className="absolute inset-0 bg-indigo-600/10" />}
                          <span className={`absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-full border-2 px-2 py-1 text-[10px] font-bold shadow-sm ${added ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-indigo-600 text-indigo-600'}`}>{added || isSelected ? <Check size={11} /> : <Plus size={11} />}{added ? 'Added' : isSelected ? 'Selected' : 'Select'}</span>
                        </div>
                        <div className="p-2"><p className="line-clamp-2 text-xs font-semibold leading-tight text-slate-900">{pName(p.name, p.localName)}</p><p className="mt-0.5 text-[10px] text-slate-400">{formatProductPackSize(p)}</p>{p.price != null && p.price > 0 && <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900 [overflow-wrap:anywhere]">₹{Number(p.price).toLocaleString('en-IN')}</p>}</div>
                      </button>;
                    })}
                  </div>
                </section>)}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Sticky import footer ───────────────────────────────────────────── */}
      {!isLoading && (
        <div className="fixed bottom-0 left-0 md:left-64 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-lg pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
            {/* Summary */}
            <div className="w-full sm:w-auto sm:flex-1 min-w-0">
              {selected.size > 0 ? (
                <p className="text-sm font-semibold text-slate-800">
                  {selected.size} product{selected.size !== 1 ? 's' : ''} selected
                </p>
              ) : (
                <p className="text-sm text-slate-400">
                  Select products to build your catalog
                </p>
              )}
              {selected.size > 0 && (
                <p className="text-xs text-slate-400">
                  Will be added as independent copies to {shop?.name}
                </p>
              )}
            </div>

            {/* Quick actions */}
            {selected.size === 0 && allSelectableInFiltered.length > 0 && (
              <button
                disabled={importing}
                onClick={toggleAll}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition whitespace-nowrap"
              >
                Select All ({allSelectableInFiltered.length})
              </button>
            )}

            {selected.size > 0 && (
              <button
                disabled={importing}
                onClick={() => setSelected(new Set())}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition"
              >
                Clear
              </button>
            )}

            <button
              onClick={handleImport}
              disabled={selected.size === 0 || importing}
              className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
            >
              {importing ? (
                <><Loader2 size={16} className="animate-spin" /> Importing…</>
              ) : (
                <><ShoppingBag size={16} /> Import {selected.size > 0 ? selected.size : ''}</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
