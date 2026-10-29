'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Old bookmarks must use the remembered shop, never the first database shop. */
export default function LegacyShopRedirect({ destination }: { destination: string }) {
  const router = useRouter();
  useEffect(() => {
    let id: string | null = null;
    try { id = localStorage.getItem('lastShopId'); } catch {}
    router.replace(id ? `/${encodeURIComponent(id)}/${destination}` : '/');
  }, [router, destination]);
  return <div className="w-full p-8 text-sm text-slate-500">Opening your shop…</div>;
}
