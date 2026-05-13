'use client';

/**
 * ShopLayoutClient — client-side wrapper for the [shopId] layout.
 *
 * The server layout (app/[shopId]/layout.tsx) is a server component and
 * cannot directly use client-side context providers. This component bridges
 * the gap: it receives shopId as a prop from the server layout and sets up
 * the client-side ShopProvider + ShopSidebar.
 *
 * The sidebar is hidden on /[shopId]/worker — workers get a clean full-screen
 * view without owner navigation.
 */

import { usePathname } from 'next/navigation';
import { ShopProvider } from '@/lib/shop-context';
import ShopSidebar from '@/components/ShopSidebar';

interface Props {
  shopId: string;
  children: React.ReactNode;
}

export default function ShopLayoutClient({ shopId, children }: Props) {
  const pathname = usePathname();

  // Worker page is a standalone full-screen view — no owner sidebar
  const isWorkerPage = pathname === `/${shopId}/worker`;

  return (
    <ShopProvider shopId={shopId}>
      {!isWorkerPage && <ShopSidebar shopId={shopId} />}
      <main className="flex-1 overflow-y-auto h-full">
        {children}
      </main>
    </ShopProvider>
  );
}
