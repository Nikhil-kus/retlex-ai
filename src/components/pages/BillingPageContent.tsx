'use client';

import type { Shop } from '@/types';
import BillingWorkspace from '@/components/pages/BillingWorkspace';

/** Use the URL's resolved shop directly; remount cart state when switching shops. */
export default function BillingPageContent({ shop, shopId }: { shop: Shop; shopId: string }) {
  return <BillingWorkspace key={shopId} initialShop={shop} />;
}
