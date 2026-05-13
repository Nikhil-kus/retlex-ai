'use client';

/**
 * src/components/ShopSidebar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-tenant sidebar. All nav links are prefixed with /[shopId]/.
 *
 * This replaces the old Sidebar.tsx for pages under /[shopId]/.
 * The old Sidebar.tsx is kept for backward compatibility with legacy routes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Store, Package, Receipt,
  History, ChartColumn, Menu, X, FileText, Users
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useHindi } from '@/lib/hindi-context';

interface ShopSidebarProps {
  shopId: string;
}

export default function ShopSidebar({ shopId }: ShopSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { hindiMode, toggleHindi } = useHindi();

  const base = `/${shopId}`;

  const navItems = [
    { href: `${base}/billing`,      label: 'Billing',      icon: Receipt },
    { href: `${base}/products`,     label: 'Products',     icon: Package },
    { href: `${base}/history`,      label: 'Bill History', icon: History },
    { href: `${base}/unpaid`,       label: 'Unpaid Bills', icon: FileText },
    { href: `${base}/analytics`,    label: 'Analytics',    icon: ChartColumn },
    { href: `${base}/worker`,       label: 'Worker View',  icon: Users },
    { href: `${base}/shop/setup`,   label: 'Shop Setup',   icon: Store },
  ];

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Hide on public/worker pages
  if (pathname.startsWith('/qr/')) return null;
  if (pathname.startsWith('/customer')) return null;

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-indigo-600 text-white rounded-md"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Hindi toggle — mobile */}
      <button
        onClick={toggleHindi}
        className={`md:hidden fixed top-4 left-4 z-50 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold shadow-md transition-all ${
          hindiMode ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 border border-slate-200'
        }`}
        title={hindiMode ? 'Hindi ON' : 'Hindi OFF'}
      >
        <span>अ</span>
        <span className={`w-6 h-3.5 rounded-full relative transition-colors ${hindiMode ? 'bg-orange-300' : 'bg-slate-200'}`}>
          <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-all ${hindiMode ? 'left-3' : 'left-0.5'}`} />
        </span>
      </button>

      {/* Sidebar */}
      <nav
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 z-50 shadow-xl`}
      >
        {/* Logo + Hindi toggle */}
        <div className="p-6 flex items-center justify-between">
          <Link href={`${base}/billing`} className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Store className="text-indigo-400" />
            Retlex<span className="text-indigo-400">AI</span>
          </Link>
          <button
            onClick={toggleHindi}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold transition-all ${
              hindiMode ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title={hindiMode ? 'Hindi ON' : 'Hindi OFF'}
          >
            <span>अ</span>
            <span className={`w-6 h-3.5 rounded-full relative transition-colors ${hindiMode ? 'bg-orange-300' : 'bg-slate-600'}`}>
              <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-all ${hindiMode ? 'left-3' : 'left-0.5'}`} />
            </span>
          </button>
        </div>

        {/* Shop ID badge */}
        <div className="px-6 pb-3">
          <span className="text-xs text-slate-500 font-mono truncate block" title={shopId}>
            Shop: {shopId.slice(0, 12)}…
          </span>
        </div>

        {/* Nav links */}
        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 bg-slate-800 text-xs text-slate-400 text-center">
          Retlex AI &copy; 2026
        </div>
      </nav>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
