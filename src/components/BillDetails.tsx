'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, Printer, Receipt, X } from 'lucide-react';
import { useHindi } from '@/lib/hindi-context';
import { getBillNumber } from '@/lib/bill-utils';

const money = (value: unknown) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2,
}).format(Number(value) || 0);

export default function BillDetails({ bill, shop, onClose }: { bill: any; shop?: any; onClose: () => void }) {
  const { pName } = useHindi();
  const dialog = useRef<HTMLDivElement>(null);
  const store = bill.shop || shop || {};
  const items = bill.items || [];
  const date = new Date(bill.createdAt || bill.date);
  const dateLabel = Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const price = (item: any) => item.price ?? item.sellingPrice ?? 0;
  const total = (item: any) => item.total ?? item.itemTotal ?? Number(price(item)) * Number(item.quantity || 0);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);

  const share = () => {
    const message = [
      `*${store.name || 'Kirana Store'}*`, getBillNumber(bill), dateLabel,
      `Customer: ${bill.customerName || 'Cash Customer'}`, '',
      ...items.map((item: any) => `${pName(item.name, item.localName)}\n${item.quantity} ${item.unit || 'pc'} × ${money(price(item))} = ${money(total(item))}`),
      '', `*Total: ${money(bill.totalAmount)}*`, `Status: ${bill.status || 'PENDING'}`,
      'Thank you for shopping with us!',
    ].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  return createPortal(
    <div id="bill-details-root" className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-6">
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="bill-details-title" tabIndex={-1}
        onKeyDown={event => {
          if (event.key === 'Escape') onClose();
          if (event.key === 'Tab') {
            const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('button');
            if (!buttons?.length) return;
            const first = buttons[0], last = buttons[buttons.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }
        }}
        className="bill-dialog flex max-h-[95dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl outline-none sm:rounded-3xl">
        <header className="bill-controls flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3"><span className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><Receipt size={22} /></span><div><h2 id="bill-details-title" className="text-lg font-bold text-slate-900">Bill details</h2><p className="text-xs text-slate-500">Your purchase, at a glance</p></div></div>
          <button onClick={onClose} aria-label="Close bill details" className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"><X size={20} /></button>
        </header>
        <div className="bill-content min-h-0 overflow-y-auto p-3 sm:p-4">
          <section className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-500">Purchase receipt</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${bill.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{bill.status || 'PENDING'}</span>
            </div>
            <h3 className="mt-1 text-sm font-bold leading-snug text-slate-900 [overflow-wrap:anywhere]">{store.name || 'Kirana Store'}</h3>
            {(store.address || store.mobile) && <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] leading-4 text-slate-500">
              {store.address && <p className="min-w-0 [overflow-wrap:anywhere]">{store.address}</p>}
              {store.mobile && <p className="min-w-0 [overflow-wrap:anywhere]">Mobile: {store.mobile}</p>}
            </div>}
            <div className="mt-2 grid grid-cols-2 gap-3 border-t border-indigo-100 pt-2">
              <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Billed to</p><p className="text-xs font-semibold leading-4 text-slate-800 [overflow-wrap:anywhere]">{bill.customerName || 'Cash Customer'}</p>{bill.customerPhone && <p className="text-[11px] leading-4 text-slate-500 [overflow-wrap:anywhere]">{bill.customerPhone}</p>}</div>
              <div className="min-w-0 text-right"><p className="text-xs font-semibold leading-4 text-slate-800 [overflow-wrap:anywhere]">{getBillNumber(bill)}</p><p className="mt-0.5 text-[11px] leading-4 text-slate-500 [overflow-wrap:anywhere]">{dateLabel}</p></div>
            </div>
          </section>
          <div className="mb-2 mt-3 flex items-center justify-between"><h3 className="text-sm font-bold text-slate-900">Items purchased</h3><span className="text-xs text-slate-500">{items.length} items</span></div>
          <ol className="space-y-1.5">
            {items.map((item: any, index: number) => (
              <li key={item.id || index} className="bill-item grid grid-cols-[minmax(0,1fr)_minmax(0,0.65fr)] items-center gap-x-3 rounded-xl border border-slate-200/70 bg-white px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-snug text-slate-800 [overflow-wrap:anywhere]">{pName(item.name, item.localName)}</p>
                  <p className="mt-1 text-[11px] leading-snug tabular-nums text-slate-500 [overflow-wrap:anywhere]">
                    <span className="font-medium text-slate-600">{item.quantity} {item.unit || 'pc'}</span>
                    <span className="mx-1 text-slate-300">×</span>{money(price(item))}
                  </p>
                </div>
                <div className="min-w-0 text-right">
                  <span className="sr-only">Amount: </span>
                  <p className="text-[13px] font-bold tabular-nums leading-snug text-indigo-950 [overflow-wrap:anywhere]">{money(total(item))}</p>
                </div>
              </li>
            ))}
          </ol>
          <section className="bill-total mt-5 rounded-2xl bg-indigo-600 p-5 text-white">
            <p className="text-xs font-medium text-indigo-100">Total amount</p><p className="mt-1 text-3xl font-bold tabular-nums tracking-tight [overflow-wrap:anywhere]">{money(bill.totalAmount)}</p>
            {bill.paymentMethod && <p className="mt-3 text-xs text-indigo-100">Payment method: {bill.paymentMethod}</p>}
          </section>
          <p className="pb-1 pt-5 text-center text-xs text-slate-400">Thank you for shopping with us!</p>
        </div>
        <footer className="bill-controls grid shrink-0 grid-cols-2 gap-3 border-t border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button onClick={share} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"><MessageCircle size={18} /> WhatsApp</button>
          <button onClick={() => window.print()} className="flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"><Printer size={18} /> Print</button>
        </footer>
      </div>
      <style>{`@media print {
        body > :not(#bill-details-root) { display: none !important; }
        body { overflow: visible !important; }
        #bill-details-root { position: static !important; display: block !important; background: white !important; padding: 0 !important; }
        #bill-details-root .bill-dialog, #bill-details-root .bill-content { display: block !important; max-height: none !important; overflow: visible !important; width: 100% !important; max-width: none !important; box-shadow: none !important; border-radius: 0 !important; }
        #bill-details-root .bill-controls { display: none !important; }
        #bill-details-root .bill-item, #bill-details-root .bill-total { break-inside: avoid; }
        #bill-details-root .bill-total { background: white !important; border: 1px solid #cbd5e1; }
        #bill-details-root .bill-total p { color: #0f172a !important; }
      }`}</style>
    </div>, document.body,
  );
}
