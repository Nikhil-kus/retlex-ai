import { redirect } from 'next/navigation';
export default async function ProductsPage({ params }: { params: Promise<{ shopId: string }> }) {
 const { shopId } = await params;
 redirect(`/${shopId}/billing`);
}
