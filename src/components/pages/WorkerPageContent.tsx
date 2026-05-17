'use client';

/**
 * WorkerPageContent
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen worker order queue. Designed to be used as a standalone PWA
 * installed on a worker's phone via the QR code from Shop Setup.
 *
 * Features:
 *   - PWA install banner (shows when browser fires beforeinstallprompt)
 *   - Auto-refreshes pending bills every 2 seconds
 *   - Tap item to mark as packed / unpacked
 *   - "Complete Order" unlocks only when all items are packed
 *   - Shows price per unit + packet weight for easy product identification
 *   - Editable location field per product (saves to Firestore automatically)
 *   - Items sorted by optimized walking order (section letter → aisle number)
 *   - "Location not assigned" warning for products without a location
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Clock, X, Check, Package, Download, MapPin, AlertTriangle } from 'lucide-react';
import { getBillLabel } from '@/lib/bill-utils';
import { useHindi } from '@/lib/hindi-context';
import { catalogCache } from '@/lib/session-cache';
import type { Shop } from '@/types';

interface Props {
  shop: Shop;
  shopId: string;
}

/**
 * Parse a location string like "A-1", "B-12", "C-9" into sortable parts.
 * Returns { section: "A", num: 1 } or null if the format doesn't match.
 */
function parseLocation(loc: string | null | undefined): { section: string; num: number } | null {
  if (!loc) return null;
  const match = loc.trim().toUpperCase().match(/^([A-Z]+)-(\d+)$/);
  if (!match) return null;
  return { section: match[1], num: parseInt(match[2], 10) };
}

/**
 * Sort bill items by optimised walking order:
 *   1. Items with a valid location come first, sorted by section letter then aisle number.
 *   2. Items without a location are appended at the end in their original order.
 */
function sortItemsByWalkingOrder(items: any[]): { item: any; originalIndex: number }[] {
  const indexed = items.map((item, originalIndex) => ({ item, originalIndex }));

  return indexed.sort((a, b) => {
    const locA = parseLocation(a.item._location);
    const locB = parseLocation(b.item._location);

    // Both have no location — preserve original order
    if (!locA && !locB) return a.originalIndex - b.originalIndex;
    // No location goes to the end
    if (!locA) return 1;
    if (!locB) return -1;

    // Sort by section letter first
    if (locA.section !== locB.section) return locA.section.localeCompare(locB.section);
    // Then by aisle number
    return locA.num - locB.num;
  });
}

export default function WorkerPageContent({ shop, shopId }: Props) {
  const { pName } = useHindi();
  const [bills, setBills] = useState<any[]>([]);
  // Full product map: productId -> product object (includes location)
  const [productMap, setProductMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [billPackedItems, setBillPackedItems] = useState<Map<string, Set<number>>>(new Map());

  // Location editing state: productId -> current input value
  const [locationEdits, setLocationEdits] = useState<Record<string, string>>({});
  // Saving state per productId
  const [savingLocation, setSavingLocation] = useState<Record<string, boolean>>({});
  // Debounce timers per productId
  const locationTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setShowInstallBanner(false);
  };

  // Load full product catalog (we need location + imageUrl)
  useEffect(() => {
    const buildMap = (products: any[]) => {
      const map: Record<string, any> = {};
      products.forEach(p => { if (p.id) map[p.id] = p; });
      setProductMap(map);
    };

    const cached = catalogCache.get(shopId);
    if (cached) {
      buildMap(cached);
    } else {
      fetch(`/api/products?shopId=${shopId}`)
        .then(r => r.json())
        .then((products: any[]) => {
          if (!Array.isArray(products)) return;
          catalogCache.set(shopId, products);
          buildMap(products);
        })
        .catch(() => {});
    }
    fetchPendingBills();
  }, [shopId]);

  // Auto-refresh every 2 seconds
  const fetchPendingBills = async () => {
    try {
      const res = await fetch(`/api/bills?shopId=${shopId}`);
      if (res.ok) {
        const allBills = await res.json();
        setBills(allBills.filter((b: any) => b.orderStatus === 'PENDING'));
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    const interval = setInterval(fetchPendingBills, 2000);
    return () => clearInterval(interval);
  }, [shopId]);

  const handleMarkDone = async (billId: string) => {
    setUpdatingId(billId);
    try {
      const res = await fetch(`/api/bills/${billId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: 'COMPLETED' }),
      });
      if (res.ok) {
        setBills(prev => prev.filter(b => b.id !== billId));
        setSelectedBill(null);
        setBillPackedItems(prev => { const n = new Map(prev); n.delete(billId); return n; });
      } else {
        alert('Failed to mark order as done');
      }
    } catch {
      alert('Network error');
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleItemPacked = (originalIndex: number) => {
    if (!selectedBill) return;
    const billId = selectedBill.id;
    setBillPackedItems(prev => {
      const n = new Map(prev);
      const s = new Set(n.get(billId) || []);
      if (s.has(originalIndex)) s.delete(originalIndex); else s.add(originalIndex);
      if (s.size === 0) n.delete(billId); else n.set(billId, s);
      return n;
    });
  };

  /**
   * Save location to Firestore via PATCH /api/products/[id].
   * Debounced — fires 800 ms after the user stops typing.
   */
  const handleLocationChange = (productId: string, value: string) => {
    setLocationEdits(prev => ({ ...prev, [productId]: value }));

    // Clear existing debounce timer
    if (locationTimers.current[productId]) {
      clearTimeout(locationTimers.current[productId]);
    }

    locationTimers.current[productId] = setTimeout(async () => {
      setSavingLocation(prev => ({ ...prev, [productId]: true }));
      try {
        const res = await fetch(`/api/products/${productId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopId, location: value.trim() }),
        });
        if (res.ok) {
          // Update local product map so sorting reflects the new location immediately
          setProductMap(prev => ({
            ...prev,
            [productId]: { ...prev[productId], location: value.trim() || null },
          }));
          // Invalidate catalog cache so next load picks up the new location
          catalogCache.clear();
        }
      } catch {}
      setSavingLocation(prev => ({ ...prev, [productId]: false }));
    }, 800);
  };

  const currentPacked = selectedBill
    ? (billPackedItems.get(selectedBill.id) || new Set<number>())
    : new Set<number>();

  const allPacked = selectedBill &&
    selectedBill.items?.length > 0 &&
    selectedBill.items.every((_: any, i: number) => currentPacked.has(i));

  /**
   * Enrich bill items with location from productMap, then sort by walking order.
   * We keep originalIndex so packed-state tracking (which uses original indices) still works.
   */
  const getSortedItems = (bill: any): { item: any; originalIndex: number }[] => {
    if (!bill?.items) return [];
    const enriched = bill.items.map((item: any) => ({
      ...item,
      _location: productMap[item.productId]?.location ?? item.location ?? null,
    }));
    return sortItemsByWalkingOrder(enriched);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">

      {/* PWA install banner */}
      {showInstallBanner && (
        <div className="bg-amber-500 text-white px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Download size={16} />
            Install this app on your phone for quick access
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstall}
              className="bg-white text-amber-600 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-50 transition"
            >
              Install
            </button>
            <button
              onClick={() => setShowInstallBanner(false)}
              className="text-amber-100 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Clock className="text-amber-400" size={24} />
              Order Queue
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">{shop.name}</p>
          </div>
          <div className="bg-amber-500/20 border border-amber-500/40 rounded-xl px-3 py-2 text-center">
            <p className="text-amber-300 font-bold text-xl leading-none">{bills.length}</p>
            <p className="text-amber-400 text-xs mt-0.5">Pending</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 px-4 pb-4 min-h-0">

        {/* Bills list */}
        <div className={`lg:w-80 flex-shrink-0 ${selectedBill ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden flex flex-col flex-1">
            <div className="bg-slate-700/60 px-4 py-3 border-b border-slate-700">
              <h2 className="text-white font-bold">Pending Orders</h2>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 gap-2">
                <Clock size={18} className="animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : bills.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 p-8">
                <CheckCircle size={36} className="text-emerald-400" />
                <p className="font-semibold text-emerald-300">All done!</p>
                <p className="text-xs text-center">No pending orders right now.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {bills.map(bill => (
                  <button
                    key={bill.id}
                    onClick={() => setSelectedBill(bill)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition ${
                      selectedBill?.id === bill.id
                        ? 'bg-amber-500/20 border-amber-500'
                        : 'bg-slate-700/40 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-white font-bold text-sm">{getBillLabel(bill)}</span>
                      <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-xs font-semibold">
                        {bill.items?.length || 0} items
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs">{new Date(bill.createdAt).toLocaleTimeString()}</p>
                    <p className="text-emerald-400 font-semibold text-sm mt-1">
                      ₹{bill.totalAmount?.toFixed(2) || '0.00'}
                    </p>
                    {/* Packed progress */}
                    {billPackedItems.get(bill.id)?.size ? (
                      <div className="mt-2">
                        <div className="h-1 bg-slate-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${((billPackedItems.get(bill.id)?.size || 0) / (bill.items?.length || 1)) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {billPackedItems.get(bill.id)?.size}/{bill.items?.length} packed
                        </p>
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bill detail */}
        {selectedBill ? (
          <div className="flex-1 bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden flex flex-col min-h-0">
            {/* Detail header */}
            <div className="bg-slate-700/60 px-5 py-4 border-b border-slate-700 flex-shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-white">{getBillLabel(selectedBill)}</h2>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {new Date(selectedBill.createdAt).toLocaleString()} ·{' '}
                    {selectedBill.customerName || 'Walk-in'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedBill(null)}
                  className="text-slate-400 hover:text-white transition p-1"
                >
                  <X size={22} />
                </button>
              </div>
              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{currentPacked.size} of {selectedBill.items?.length || 0} packed</span>
                  <span>{Math.round((currentPacked.size / (selectedBill.items?.length || 1)) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${(currentPacked.size / (selectedBill.items?.length || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Items — sorted by walking order */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {getSortedItems(selectedBill).map(({ item, originalIndex }) => {
                const isPacked = currentPacked.has(originalIndex);
                const imgSrc = item.imageUrl || productMap[item.productId]?.imageUrl;
                const location: string | null = productMap[item.productId]?.location ?? item._location ?? null;
                const editValue = locationEdits[item.productId] ?? location ?? '';
                const isSaving = savingLocation[item.productId] ?? false;

                return (
                  <div
                    key={originalIndex}
                    className={`rounded-xl border-2 transition ${
                      isPacked
                        ? 'bg-emerald-500/15 border-emerald-500'
                        : 'bg-slate-700/40 border-slate-700'
                    }`}
                  >
                    {/* Tappable area for pack/unpack */}
                    <button
                      onClick={() => toggleItemPacked(originalIndex)}
                      className="w-full p-4 text-left active:scale-[0.99] transition"
                    >
                      <div className="flex items-center gap-3">
                        {/* Checkbox */}
                        <div className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition ${
                          isPacked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'
                        }`}>
                          {isPacked && <Check size={15} className="text-white" />}
                        </div>

                        {/* Image */}
                        <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-slate-700 border border-slate-600 flex items-center justify-center">
                          {imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={e => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (
                            <Package size={22} className="text-slate-500" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-base leading-tight ${
                            isPacked ? 'text-emerald-300 line-through' : 'text-white'
                          }`}>
                            {pName(item.name, item.localName)}
                          </p>

                          {/* Location display */}
                          {location ? (
                            <p className="flex items-center gap-1 text-sky-400 text-xs font-medium mt-0.5">
                              <MapPin size={11} />
                              {location}
                            </p>
                          ) : (
                            <p className="flex items-center gap-1 text-amber-500 text-xs font-medium mt-0.5">
                              <AlertTriangle size={11} />
                              Location not assigned
                            </p>
                          )}

                          <p className="text-slate-400 text-sm mt-0.5">
                            {item.quantity} {item.unit || 'pc'}
                            {item.packetWeight
                              ? <span className="text-slate-500"> · {item.packetWeight}{item.packetUnit || 'g'}/pc</span>
                              : null}
                          </p>
                          <p className="text-amber-300 text-sm font-semibold mt-0.5">
                            ₹{(item.sellingPrice ?? item.price)?.toFixed(2) || '0.00'} per {item.unit || 'pc'}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Editable location input — only shown when product has an id */}
                    {item.productId && (
                      <div
                        className="px-4 pb-3 flex items-center gap-2"
                        onClick={e => e.stopPropagation()}
                      >
                        <MapPin size={13} className="text-slate-500 flex-shrink-0" />
                        <input
                          type="text"
                          value={editValue}
                          onChange={e => handleLocationChange(item.productId, e.target.value)}
                          placeholder="e.g. A-1, B-12"
                          className="flex-1 bg-slate-900/60 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                        />
                        {isSaving && (
                          <span className="text-slate-500 text-xs flex-shrink-0">saving…</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="bg-slate-900/60 border-t border-slate-700 p-4 flex-shrink-0 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Order Total</span>
                <span className="text-emerald-400 font-bold text-xl">
                  ₹{selectedBill.totalAmount?.toFixed(2) || '0.00'}
                </span>
              </div>
              <button
                onClick={() => handleMarkDone(selectedBill.id)}
                disabled={updatingId === selectedBill.id || !allPacked}
                className={`w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition text-base ${
                  allPacked
                    ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98]'
                    : 'bg-slate-700 cursor-not-allowed opacity-50'
                }`}
              >
                <CheckCircle size={20} />
                {updatingId === selectedBill.id
                  ? 'Completing…'
                  : allPacked
                    ? 'Complete Order ✓'
                    : `Pack all ${(selectedBill.items?.length || 0) - currentPacked.size} remaining items`}
              </button>
            </div>
          </div>
        ) : (
          /* Empty state when no bill selected (desktop only) */
          <div className="hidden lg:flex flex-1 bg-slate-800/30 border border-slate-700/50 rounded-2xl items-center justify-center text-slate-500 flex-col gap-3">
            <Clock size={40} className="opacity-30" />
            <p>Select an order to start packing</p>
          </div>
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div className="text-center text-slate-600 text-xs pb-3 flex-shrink-0">
        ● Auto-refreshing every 2 seconds
      </div>
    </div>
  );
}
