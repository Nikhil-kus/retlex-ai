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
  Package, Search, ArrowLeft, ChevronDown, ChevronRight,
  Check, Loader2, RefreshCw, ShoppingBag, CheckSquare, Square,
} from 'lucide-react';
import Link from 'next/link';

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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
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
        // Auto-expand all categories on first load
        const cats = new Set(data.map(p => p.category || 'Uncategorized'));
        setExpandedCategories(cats);
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
  const allSelectableInFiltered = filtered.filter(p => !isAlreadyAdded(p));

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

  const toggleCategoryExpand = (cat: string) => {
    setExpandedCategories(prev => {
      const n = new Set(prev);
      if (n.has(cat)) n.delete(cat); else n.add(cat);
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
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
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products or Hindi names…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
              />
            </div>
            {/* Select all visible */}
            {!isLoading && allSelectableInFiltered.length > 0 && (
              <button
                onClick={toggleAll}
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
              Add products to any shop first, or run{' '}
              <code className="bg-slate-100 px-1 rounded text-xs">node scripts/db-migrate.mjs</code>{' '}
              to seed from your main shop.
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
                  onClick={() => router.push(`/${shopId}/products`)}
                  className="text-xs text-emerald-700 font-bold hover:underline"
                >
                  View Products →
                </button>
              </div>
            )}

            {/* Category groups */}
            <div className="space-y-3">
              {categories.map(cat => {
                const products = grouped.get(cat) || [];
                const selectable = products.filter(p => !isAlreadyAdded(p));
                const alreadyAdded = products.filter(p => isAlreadyAdded(p));
                const selectedInCat = selectable.filter(p => selected.has(p.id)).length;
                const allCatSelected = selectable.length > 0 && selectedInCat === selectable.length;
                const isExpanded = expandedCategories.has(cat);

                return (
                  <div key={cat} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    {/* Category header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
                      {/* Category checkbox */}
                      {selectable.length > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); toggleCategory(cat); }}
                          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                            allCatSelected
                              ? 'bg-indigo-600 border-indigo-600'
                              : selectedInCat > 0
                                ? 'bg-indigo-200 border-indigo-400'
                                : 'border-slate-300 hover:border-indigo-400'
                          }`}
                          title={allCatSelected ? 'Deselect category' : 'Select all in category'}
                        >
                          {allCatSelected && <Check size={12} className="text-white" />}
                          {!allCatSelected && selectedInCat > 0 && (
                            <div className="w-2 h-2 bg-indigo-500 rounded-sm" />
                          )}
                        </button>
                      )}

                      {/* Category name + counts */}
                      <button
                        onClick={() => toggleCategoryExpand(cat)}
                        className="flex-1 flex items-center gap-2 text-left"
                      >
                        <span className="font-bold text-slate-800 text-sm">{cat}</span>
                        <span className="text-xs text-slate-400">
                          {products.length} products
                        </span>
                        {alreadyAdded.length > 0 && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                            {alreadyAdded.length} added
                          </span>
                        )}
                        {selectedInCat > 0 && (
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">
                            {selectedInCat} selected
                          </span>
                        )}
                        <span className="ml-auto text-slate-400">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                      </button>
                    </div>

                    {/* Products grid */}
                    {isExpanded && (
                      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {products.map(p => {
                          const added = isAlreadyAdded(p);
                          const isSelected = selected.has(p.id);

                          return (
                            <button
                              key={p.id}
                              onClick={() => !added && toggleProduct(p.id)}
                              disabled={added}
                              className={`relative flex flex-col rounded-xl border-2 overflow-hidden text-left transition ${
                                added
                                  ? 'border-emerald-200 bg-emerald-50/50 opacity-70 cursor-default'
                                  : isSelected
                                    ? 'border-indigo-500 bg-indigo-50/40 shadow-md shadow-indigo-100'
                                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm active:scale-[0.98]'
                              }`}
                            >
                              {/* Selection indicator */}
                              <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 ${
                                added
                                  ? 'bg-emerald-500 border-emerald-500'
                                  : isSelected
                                    ? 'bg-indigo-600 border-indigo-600'
                                    : 'bg-white border-slate-300'
                              }`}>
                                {(added || isSelected) && <Check size={11} className="text-white" />}
                              </div>

                              {/* Product image */}
                              <div className="w-full aspect-square bg-slate-100 overflow-hidden">
                                {p.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={p.imageUrl}
                                    alt={p.name}
                                    className="w-full h-full object-cover"
                                    onError={e => { e.currentTarget.style.display = 'none'; }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package size={24} className="text-slate-300" />
                                  </div>
                                )}
                              </div>

                              {/* Product info */}
                              <div className="p-2">
                                <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-tight">
                                  {p.name}
                                </p>
                                {p.localName && (
                                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{p.localName}</p>
                                )}
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-[10px] text-slate-500">{p.baseUnit || 'pc'}</span>
                                  {p.price > 0 && (
                                    <span className="text-[10px] font-bold text-emerald-600">₹{p.price}</span>
                                  )}
                                </div>
                                {added && (
                                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">✓ In your shop</p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Sticky import footer ───────────────────────────────────────────── */}
      {!isLoading && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
            {/* Summary */}
            <div className="flex-1 min-w-0">
              {selected.size > 0 ? (
                <p className="text-sm font-semibold text-slate-800">
                  {selected.size} product{selected.size !== 1 ? 's' : ''} selected
                </p>
              ) : (
                <p className="text-sm text-slate-400">
                  Tap products or category checkboxes to select
                </p>
              )}
              {selected.size > 0 && (
                <p className="text-xs text-slate-400">
                  Will be added as independent copies to {shop?.name}
                </p>
              )}
            </div>

            {/* Quick actions */}
            {selected.size === 0 && totalSelectable > 0 && (
              <button
                onClick={toggleAll}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition whitespace-nowrap"
              >
                Select All ({totalSelectable})
              </button>
            )}

            {selected.size > 0 && (
              <button
                onClick={() => setSelected(new Set())}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition"
              >
                Clear
              </button>
            )}

            <button
              onClick={handleImport}
              disabled={selected.size === 0 || importing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
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
