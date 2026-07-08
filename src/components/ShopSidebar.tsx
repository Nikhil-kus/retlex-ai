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
  History, ChartColumn, Menu, X, FileText, Users, Sparkles
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useHindi } from '@/lib/hindi-context';
import { useShop } from '@/lib/shop-context';

interface ShopSidebarProps {
  shopId: string;
}

export default function ShopSidebar({ shopId }: ShopSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { hindiMode, toggleHindi, isSearching, headerVisible } = useHindi();
  const { shop } = useShop();

  const base = `/${shopId}`;

  const navItems = [
    { href: `${base}/billing`,        label: 'Billing',        icon: Receipt },
    { href: `${base}/products`,       label: 'Products',       icon: Package },
    { href: `${base}/shop/ingest`,    label: 'AI Ingest',      icon: Sparkles },
    { href: `${base}/history`,        label: 'Bill History',   icon: History },
    { href: `${base}/unpaid`,         label: 'Unpaid Bills',   icon: FileText },
    { href: `${base}/analytics`,      label: 'Analytics',      icon: ChartColumn },
    { href: `${base}/worker`,         label: 'Worker View',    icon: Users },
    { href: `${base}/shop/setup`,     label: 'Shop Setup',     icon: Store },
  ];

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Hide on public/worker pages
  if (pathname.startsWith('/qr/')) return null;
  if (pathname.startsWith('/customer')) return null;

  return (
    <>
      {/* Shop icon — top-left, hides with header on scroll-down */}
      {!isSearching && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          className="md:hidden fixed top-3 left-3 z-50 w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 active:scale-95 transition-all duration-300 overflow-hidden"
          style={{ opacity: headerVisible ? 1 : 0, pointerEvents: headerVisible ? 'auto' : 'none', transform: headerVisible ? 'translateY(0)' : 'translateY(-56px)' }}
        >
          {isOpen ? (
            <X size={20} strokeWidth={2.5} />
          ) : shop?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shop.logoUrl}
              alt={shop.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Store size={20} />
          )}
        </button>
      )}



      {/* Sidebar */}
      <nav
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 z-50 shadow-xl`}
      >
        {/* Logo + Hindi toggle */}
        <div className="p-6 flex items-center justify-between">
          <Link href={`${base}/billing`} className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            {shop?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shop.logoUrl}
                alt={shop.name}
                className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <Store className="text-indigo-400" />
            )}
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
