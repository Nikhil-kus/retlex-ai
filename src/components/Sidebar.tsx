'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Store, Package, Receipt, History, ChartColumn, Menu, X, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useHindi } from '@/lib/hindi-context';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/billing', label: 'Billing', icon: Receipt },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/history', label: 'Bill History', icon: History },
  { href: '/unpaid', label: 'Unpaid Bills', icon: FileText },
  { href: '/analytics', label: 'Analytics', icon: ChartColumn },
  { href: '/shop/setup', label: 'Shop Setup', icon: Store },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { hindiMode, toggleHindi } = useHindi();

  // Reset main scroll container on route change
  useEffect(() => {
    document.getElementById('main-scroll-container')?.scrollTo(0, 0);
  }, [pathname]);

  // If path is public QR route, hide sidebar
  if (pathname.startsWith('/qr/')) return null;

  // Hide sidebar entirely on customer and worker pages — they are not shop owner pages
  const isRestrictedPage = pathname.startsWith('/customer') || pathname.startsWith('/worker');
  if (isRestrictedPage) return null;

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-indigo-600 text-white rounded-md"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Hindi toggle — fixed top-left, visible on mobile when sidebar is closed */}
      <button
        onClick={toggleHindi}
        className={`md:hidden fixed top-4 left-4 z-50 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold shadow-md transition-all ${
          hindiMode
            ? 'bg-orange-500 text-white'
            : 'bg-white text-slate-600 border border-slate-200'
        }`}
        title={hindiMode ? 'Hindi ON — tap to switch to English' : 'Hindi OFF — tap to switch to Hindi'}
      >
        <span>अ</span>
        <span className={`w-6 h-3.5 rounded-full relative transition-colors ${hindiMode ? 'bg-orange-300' : 'bg-slate-200'}`}>
          <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-all ${hindiMode ? 'left-3' : 'left-0.5'}`} />
        </span>
      </button>

      {/* Sidebar navigation */}
      <nav
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 z-50 shadow-xl`}
      >
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Store className="text-indigo-400" />
            Kirana<span className="text-indigo-400">MVP</span>
          </h1>
          {/* Hindi toggle inside sidebar (desktop) */}
          <button
            onClick={toggleHindi}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold transition-all ${
              hindiMode
                ? 'bg-orange-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title={hindiMode ? 'Hindi ON' : 'Hindi OFF'}
          >
            <span>अ</span>
            <span className={`w-6 h-3.5 rounded-full relative transition-colors ${hindiMode ? 'bg-orange-300' : 'bg-slate-600'}`}>
              <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-all ${hindiMode ? 'left-3' : 'left-0.5'}`} />
            </span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
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
          Kirana MVP &copy; 2026
        </div>
      </nav>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
