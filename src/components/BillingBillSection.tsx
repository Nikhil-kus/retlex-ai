'use client';

import { CheckCircle, ChevronRight, Clock3, ShoppingCart, TriangleAlert } from 'lucide-react';
import type { Bill } from '@/types';
import { getBillDate, getBillLabel } from '@/lib/bill-utils';

type BillKind = 'pending' | 'completed' | 'unpaid';

const styles = {
  pending: {
    title: 'Pending',
    empty: 'No pending orders',
    icon: Clock3,
    iconClass: 'bg-orange-50 border-orange-100 text-orange-500',
    cardClass: 'hover:border-orange-300 hover:shadow-orange-50 focus-visible:outline-orange-500',
    accentClass: 'bg-orange-400',
  },
  completed: {
    title: 'Completed',
    empty: 'No completed orders yet',
    icon: CheckCircle,
    iconClass: 'bg-emerald-50 border-emerald-100 text-emerald-500',
    cardClass: 'hover:border-emerald-300 hover:shadow-emerald-50 focus-visible:outline-emerald-500',
    accentClass: 'bg-emerald-400',
  },
  unpaid: {
    title: 'Unpaid',
    empty: 'No unpaid bills',
    icon: TriangleAlert,
    iconClass: 'bg-rose-50 border-rose-100 text-rose-500',
    cardClass: 'hover:border-rose-300 hover:shadow-rose-50 focus-visible:outline-rose-500',
    accentClass: 'bg-rose-400',
  },
};

interface Props {
  bills: Bill[];
  kind: BillKind;
  limit: number;
  expanded: boolean;
  loading: boolean;
  onToggle: () => void;
  onSelect: (bill: Bill) => void;
}

export default function BillingBillSection({ bills, kind, limit, expanded, loading, onToggle, onSelect }: Props) {
  const theme = styles[kind];
  const Icon = theme.icon;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const visibleBills = expanded ? bills : bills.slice(0, limit);
  const groups = new Map<string, { title: string; bills: Bill[] }>();

  for (const bill of visibleBills) {
    const date = getBillDate(bill);
    const key = kind === 'unpaid' ? 'unpaid' : date ? date.toDateString() : 'unknown';
    let title = theme.title;

    if (kind !== 'unpaid' && date) {
      const day = date.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short',
        ...(date.getFullYear() !== today.getFullYear() ? { year: 'numeric' as const } : {}),
      });
      if (kind === 'completed') title = `Completed · ${day}`;
      else if (key === today.toDateString()) title = `Today · ${day}`;
      else if (key === yesterday.toDateString()) title = `Yesterday · ${day}`;
      else title = day;
    }

    if (!groups.has(key)) groups.set(key, { title, bills: [] });
    groups.get(key)!.bills.push(bill);
  }

  const heading = (title: string, count: number) => (
    <div className="mb-2 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${theme.accentClass}`} />
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">{title}</h3>
      </div>
      {count > 0 && <span className="shrink-0 text-xs text-slate-500">{count} bill{count !== 1 ? 's' : ''}</span>}
    </div>
  );

  return (
    <section aria-label={`${theme.title} bills`} className="space-y-4">
      {loading ? (
        <div>
          {heading(theme.title, 0)}
          <div className="space-y-1.5">{[1, 2].map(i => <div key={i} className="h-[62px] animate-pulse rounded-xl bg-slate-100" />)}</div>
        </div>
      ) : bills.length === 0 ? (
        <div>
          {heading(theme.title, 0)}
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-6 text-slate-400">
            {kind === 'pending' && <ShoppingCart size={24} className="opacity-30" />}
            <p className="text-sm">{theme.empty}</p>
          </div>
        </div>
      ) : (
        <>
          {Array.from(groups, ([key, group]) => (
            <div key={key}>
              {heading(group.title, group.bills.length)}
              <div className="space-y-1.5">
                {group.bills.map(bill => {
                  const label = getBillLabel(bill);
                  const itemCount = bill.items?.length || 0;

                  return (
                    <button
                      key={bill.id}
                      type="button"
                      onClick={() => onSelect(bill)}
                      aria-label={`Open ${theme.title.toLowerCase()} bill: ${label}`}
                      className={`group relative flex min-h-[62px] w-full items-center gap-2.5 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left transition-all hover:bg-gray-100 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 ${theme.cardClass}`}
                    >
                      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-0.5 rounded-full ${theme.accentClass} ${kind === 'pending' ? '' : 'opacity-0 transition-opacity group-hover:opacity-100'}`} />
                      <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${theme.iconClass}`}><Icon size={18} /></span>
                      <span className="min-w-0 flex-1">
                        <span title={label} className="block truncate text-sm font-semibold leading-5 text-slate-900">{label}</span>
                        <span className="block text-xs leading-4 text-slate-500">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                      </span>
                      <span className={`shrink-0 text-sm font-bold tabular-nums ${kind === 'unpaid' ? 'text-rose-600' : 'text-slate-900'}`}>₹{(bill.totalAmount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                      <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {bills.length > limit && (
            <button type="button" onClick={onToggle} className="w-full rounded-xl border border-dashed border-slate-200 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700">
              {expanded ? 'Show less' : `Show ${bills.length - limit} more`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
