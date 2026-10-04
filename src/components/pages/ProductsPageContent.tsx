'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Shop } from '@/types';
export default function ProductsPageContent({ shopId }: { shop: Shop; shopId: string }) {
 const router = useRouter();
 useEffect(() => { router.replace('/' + shopId + '/billing'); }, [router, shopId]);
 return null;
}
