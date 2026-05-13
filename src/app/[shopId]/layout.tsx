/**
 * src/app/[shopId]/layout.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-tenant shop layout.
 *
 * Architecture:
 *   - Every page under /[shopId]/ is wrapped by this layout.
 *   - The shopId from the URL is passed to ShopProvider, which fetches
 *     the shop document and makes it available via useShop() to all children.
 *   - The Sidebar receives the shopId so it can build correct nav links.
 *
 * URL structure:
 *   /[shopId]/billing       → billing page for this shop
 *   /[shopId]/products      → products page for this shop
 *   /[shopId]/history       → bill history for this shop
 *   /[shopId]/unpaid        → unpaid bills for this shop
 *   /[shopId]/analytics     → analytics for this shop
 *   /[shopId]/worker        → worker order queue for this shop
 *   /[shopId]/shop/setup    → shop settings
 *
 * Auth-ready:
 *   When Firebase Auth is added, add a server-side check here:
 *   const session = await getServerSession();
 *   if (!session || session.user.shopId !== shopId) redirect('/login');
 * ─────────────────────────────────────────────────────────────────────────────
 */

import ShopLayoutClient from '@/components/ShopLayoutClient';

interface ShopLayoutProps {
  children: React.ReactNode;
  params: Promise<{ shopId: string }>;
}

export default async function ShopLayout({ children, params }: ShopLayoutProps) {
  const { shopId } = await params;

  return (
    <ShopLayoutClient shopId={shopId}>
      {children}
    </ShopLayoutClient>
  );
}
