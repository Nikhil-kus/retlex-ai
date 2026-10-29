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
  Store, Package, Receipt,
  ChartColumn, X, Users, Sparkles
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
  const { hindiMode, toggleHindi, isSearching } = useHindi();
  const { shop } = useShop();

  const base = `/${shopId}`;

  const navItems = [
    { href: `${base}/billing`,        label: 'Billing',        icon: Receipt },
    { href: `${base}/shop/catalog-setup`, label: 'Product Catalog', icon: Package },
    { href: `${base}/shop/ingest`,    label: 'AI Ingest',      icon: Sparkles },
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
      {/* Keep the image menu button anchored while the page scrolls. */}
      {!isSearching && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          className="md:hidden fixed top-3 left-3 z-50 w-12 h-12 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 overflow-hidden group"
        >
          <div className="absolute inset-0 bg-white/20 group-hover:bg-white/30 transition-colors"></div>
          {isOpen ? (
            <X size={22} strokeWidth={2.5} className="relative z-10" />
          ) : shop?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shop.logoUrl}
              alt={shop.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Store size={22} className="relative z-10" />
          )}
        </button>
      )}



      {/* Sidebar */}
      <nav
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-800 text-neutral-100 flex flex-col transition-transform transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 z-50 shadow-2xl`}
      >
        {/* Logo + Hindi toggle */}
        <div className="p-6 flex items-center justify-between border-b border-neutral-700/50">
          <Link href={`${base}/billing`} className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 hover:scale-105 transition-transform">
            {shop?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shop.logoUrl}
                alt={shop.name}
                className="w-9 h-9 rounded-xl object-cover flex-shrink-0 shadow-md"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
                <Store size={20} className="text-white" />
              </div>
            )}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Retlex<span className="text-amber-400">AI</span>
            </span>
          </Link>
          <button
            onClick={toggleHindi}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 ${
              hindiMode ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
            }`}
            title={hindiMode ? 'Hindi ON' : 'Hindi OFF'}
          >
            <span>अ</span>
            <span className={`w-6 h-3.5 rounded-full relative transition-colors ${hindiMode ? 'bg-amber-300' : 'bg-neutral-600'}`}>
              <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-all ${hindiMode ? 'left-3' : 'left-0.5'}`} />
            </span>
          </button>
        </div>

        {/* Shop ID badge */}
        <div className="px-6 py-3 bg-neutral-800/50">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs text-neutral-400 font-mono truncate block" title={shopId}>
              Shop: {shopId.slice(0, 12)}…
            </span>
          </div>
        </div>

        {/* Nav links */}
        <div className="flex-1 overflow-y-auto py-2 px-3 space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group relative overflow-hidden
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                      : 'text-neutral-300 hover:bg-neutral-800 hover:text-white hover:scale-105'
                  }
                `}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                )}
                <Icon size={20} className={`relative z-10 ${isActive ? '' : 'group-hover:scale-110 transition-transform'}`} />
                <span className="font-semibold relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 bg-neutral-800/50 text-xs text-neutral-400 text-center border-t border-neutral-700/50">
          <p className="font-semibold">Retlex AI &copy; 2026</p>
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
