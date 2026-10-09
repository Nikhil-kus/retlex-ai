'use client';

import { useState, useRef } from 'react';
import { ShoppingCart, Package, X, CheckCircle } from 'lucide-react';
import { useHindi } from '@/lib/hindi-context';

export default function CheckoutPanel({ cart, catalog, totalAmount, customerInfo, setCustomerInfo, savingBill, error, calculateItemTotal, updateCartItem, removeFromCart, handleGenerateBill, expanded, onExpand, onCollapse, onClearCart, onPriceUpdate }: any) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragCurrentY = useRef(0);
  const isDragging = useRef(false);
  const { pName } = useHindi();

  // Price edit state
  const [editingPriceIdx, setEditingPriceIdx] = useState<number | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');
  const priceInputRef = useRef<HTMLInputElement>(null);

  const openPriceEdit = (idx: number) => {
    setEditingPriceValue(String(cart[idx].price || 0));
    setEditingPriceIdx(idx);
    setTimeout(() => { priceInputRef.current?.select(); }, 80);
  };

  const confirmPriceEdit = () => {
    if (editingPriceIdx === null) return;
    const newPrice = parseFloat(editingPriceValue);
    if (!isNaN(newPrice) && newPrice >= 0) {
      updateCartItem(editingPriceIdx, 'price', newPrice);
      // Also persist to the product database
      const productId = cart[editingPriceIdx]?.productId;
      if (productId && onPriceUpdate) {
        onPriceUpdate(productId, newPrice);
      }
    }
    setEditingPriceIdx(null);
  };

  // Bill-only: updates cart price without touching the product catalog
  const confirmPriceEditBillOnly = () => {
    if (editingPriceIdx === null) return;
    const newPrice = parseFloat(editingPriceValue);
    if (!isNaN(newPrice) && newPrice >= 0) {
      updateCartItem(editingPriceIdx, 'price', newPrice);
    }
    setEditingPriceIdx(null);
  };

  // Full sheet height vs mini bar height (~64px)
  const MINI_HEIGHT = 64;
  const FULL_HEIGHT_VH = 96;

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = 0;
    isDragging.current = true;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    if (expanded && dy < 0) return;   // can't drag up when already expanded
    if (!expanded && dy > 0) return;  // can't drag down when already mini
    dragCurrentY.current = dy;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (sheetRef.current) sheetRef.current.style.transition = 'transform 220ms ease-out';
    const dy = dragCurrentY.current;
    if (expanded && dy > 100) {
      // Collapse to mini
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
      onCollapse();
    } else if (!expanded && dy < -60) {
      // Expand to full
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
      onExpand();
    } else {
      // Snap back
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
    }
    dragCurrentY.current = 0;
  };

  return (
    <>
      {/* Backdrop — only when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onCollapse}
        />
      )}

      {/* The sheet itself — always mounted, switches between mini and full */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white shadow-2xl"
        style={{
          borderRadius: expanded ? '24px 24px 0 0' : '20px 20px 0 0',
          maxHeight: expanded ? `${FULL_HEIGHT_VH}vh` : `${MINI_HEIGHT}px`,
          height: expanded ? `${FULL_HEIGHT_VH}vh` : `${MINI_HEIGHT}px`,
          transition: 'max-height 220ms ease-out, height 220ms ease-out, border-radius 220ms ease-out',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── MINI BAR (collapsed) ── */}
        {!expanded && (
          <div
            className="flex items-center gap-3 px-4 h-full cursor-pointer active:bg-slate-50 transition"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={onExpand}
          >
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-slate-300" />
            {(() => {
              const lastItem = cart.length > 0 ? cart[cart.length - 1] : null;
              const lastProduct = lastItem && catalog ? catalog.find((cp: any) => cp.id === lastItem.productId) : null;
              return lastProduct?.imageUrl ? (
                <div className="w-9 h-9 rounded-xl overflow-hidden border-2 border-indigo-400 shrink-0" style={{overflow:'hidden'}}>
                  <div className="relative w-full h-full">
                    <img src={lastProduct.imageUrl} alt={lastProduct.name} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display='none'; }} />
                    <div className="absolute inset-0" style={{background:'rgba(79,70,229,0.12)'}} />
                  </div>
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                  <ShoppingCart size={18} className="text-white" />
                </div>
              );
            })()}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm">{cart.length} item{cart.length !== 1 ? 's' : ''} in bill</p>
              <p className="text-xs text-slate-500">Tap or swipe up to view</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-emerald-600 text-base">₹{totalAmount.toFixed(0)}</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); onClearCart(); }}
              className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center shrink-0 hover:bg-rose-200 active:scale-90 transition-all"
              title="Clear all items"
            >
              <X size={14} className="text-rose-500" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* ── FULL SHEET (expanded) ── */}
        {expanded && (
          <>
            {/* Drag handle + down arrow button */}
            <div
              className="flex flex-col items-center pt-2 pb-1 flex-shrink-0 cursor-grab gap-1"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="w-10 h-1.5 rounded-full bg-slate-300" />
              <button
                onClick={onCollapse}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 transition"
                title="Collapse"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </button>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart size={18} className="text-indigo-500" /> Current Bill
                <span className="bg-indigo-100 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">{cart.length}</span>
              </h2>
              <button
                onClick={onClearCart}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition"
                title="Clear bill"
              >
                <X size={16} />
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                  <ShoppingCart size={40} className="opacity-20" />
                  <p className="text-sm">Cart is empty</p>
                </div>
              ) : (
                cart.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50 rounded-xl p-2 border border-slate-100">
                    {/* Tappable left section — opens price editor */}
                    <button
                      className="flex items-center gap-2 flex-1 min-w-0 text-left active:opacity-70 transition-opacity"
                      onClick={() => openPriceEdit(idx)}
                      title="Tap to edit selling price"
                    >
                      <div className="w-9 h-9 rounded-lg bg-white overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
                        {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <Package className="text-slate-400" size={14} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{pName(item.name, item.localName)}</p>
                        {(() => {
                          const bq = Number(item.baseQuantity) || 1;
                          const bu = (item.baseUnit || 'pc').toLowerCase();
                          const isWV = ['g','ml','kg','l'].includes(bu);
                          const unitLabel = isWV && bq > 1 ? `${bq}${bu}` : bu;
                          return <p className="text-xs text-indigo-500 font-medium">₹{(item.price || 0).toFixed(2)} / {unitLabel} <span className="text-slate-400 font-normal">· tap to edit</span></p>;
                        })()}
                      </div>
                    </button>
                    {(() => {
                      const bq = Number(item.baseQuantity) || 1;
                      const bu = (item.baseUnit || 'pc').toLowerCase();
                      const step = ['g','ml','kg','l'].includes(bu) && bq > 1 ? bq : 1;
                      return (
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg h-7 shrink-0">
                          <button onClick={() => { const q = item.quantity - step; q <= 0 ? removeFromCart(idx) : updateCartItem(idx, 'quantity', q); }} className="w-6 h-full flex items-center justify-center text-slate-500 text-sm font-bold">−</button>
                          <span className="text-xs font-bold text-slate-800 px-1">{item.quantity}</span>
                          <button onClick={() => updateCartItem(idx, 'quantity', item.quantity + step)} className="w-6 h-full flex items-center justify-center text-slate-500 text-sm font-bold">+</button>
                        </div>
                      );
                    })()}
                    <p className="text-sm font-bold text-indigo-600 shrink-0 w-14 text-right">₹{calculateItemTotal(item).toFixed(0)}</p>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-2 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">Total</span>
                  <span className="text-xl font-bold text-emerald-600">₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    placeholder="📱 Phone Number"
                    value={customerInfo.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const newInfo = { ...customerInfo, phone: val };
                      setCustomerInfo(newInfo);
                      if (val.length === 10) { handleGenerateBill(newInfo); }
                    }}
                    className="w-full bg-white border-2 border-indigo-200 rounded-xl px-4 py-2.5 text-base font-semibold focus:outline-none focus:border-indigo-500 placeholder:text-slate-400 placeholder:font-normal tracking-wider"
                  />
                  <input
                    type="text"
                    placeholder="Customer Name (optional)"
                    value={customerInfo.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCustomerInfo({ ...customerInfo, status: 'PAID' })} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${customerInfo.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>✓ Paid</button>
                  <button onClick={() => setCustomerInfo({ ...customerInfo, status: 'UNPAID' })} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${customerInfo.status === 'UNPAID' ? 'bg-rose-100 text-rose-700 border border-rose-300' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>Unpaid</button>
                </div>
                {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
                <button
                  disabled={savingBill}
                  onClick={() => { handleGenerateBill(); }}
                  className="w-full bg-indigo-600 text-white font-bold py-3 rounded-2xl hover:bg-indigo-500 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  <CheckCircle size={18} />
                  {savingBill ? 'Saving…' : 'Generate Bill'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Price Edit Modal — shown when a cart item card is tapped */}
      {editingPriceIdx !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setEditingPriceIdx(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl px-5 pt-5 pb-8 border-t border-slate-100"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1.5 rounded-full bg-slate-300 mx-auto mb-4" />

            {/* Product name */}
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Edit Selling Price</p>
            <p className="font-bold text-slate-900 text-base mb-4 truncate">
              {pName(cart[editingPriceIdx]?.name, cart[editingPriceIdx]?.localName)}
            </p>

            {/* Price input */}
            <div className="flex items-center bg-slate-50 border-2 border-indigo-300 rounded-2xl px-4 h-14 gap-2 focus-within:border-indigo-500 transition-colors">
              <span className="text-2xl font-bold text-slate-400">₹</span>
              <input
                ref={priceInputRef}
                type="number"
                inputMode="decimal"
                className="flex-1 bg-transparent text-2xl font-bold text-slate-900 focus:outline-none"
                value={editingPriceValue}
                onChange={e => setEditingPriceValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmPriceEditBillOnly(); if (e.key === 'Escape') setEditingPriceIdx(null); }}
                autoFocus
              />
              <span className="text-sm text-slate-400 font-medium">/ {cart[editingPriceIdx]?.baseUnit}</span>
            </div>

            <p className="text-xs text-slate-400 mt-2 mb-5">
              Original price: ₹{(cart[editingPriceIdx]?.price || 0).toFixed(2)} — "This Bill Only" keeps catalog unchanged
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setEditingPriceIdx(null)}
                className="py-3 px-4 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmPriceEditBillOnly}
                className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-500 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 ring-2 ring-indigo-400 ring-offset-1"
              >
                This Bill Only
              </button>
              <button
                onClick={confirmPriceEdit}
                className="py-3 px-4 rounded-2xl bg-slate-700 text-white font-bold text-sm hover:bg-slate-600 active:scale-[0.98] transition-all"
              >
                Update Price
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

