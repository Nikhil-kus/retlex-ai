/**
 * Legacy route group layout — wraps old routes like /billing, /products, etc.
 *
 * These routes are kept for backward compatibility. They still use the old
 * Sidebar and the ACTIVE_SHOP_ID env var approach.
 *
 * New routes should use /[shopId]/... instead.
 */

import Sidebar from "@/components/Sidebar";

export default function LegacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-y-auto h-full">
        {children}
      </main>
    </>
  );
}
