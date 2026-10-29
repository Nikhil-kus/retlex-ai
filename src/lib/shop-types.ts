export const SHOP_TYPES = [
  { id: 'kirana', name: 'Kirana', localName: 'किराना', description: 'Groceries, daily essentials and household products', icon: '🛒' },
  { id: 'tent', name: 'Tent House', localName: 'टेंट हाउस', description: 'Tents, seating, event supplies and catering equipment', icon: '⛺' },
  { id: 'electronics', name: 'Electronics', localName: 'इलेक्ट्रॉनिक्स', description: 'Lighting, electrical fittings, appliances and accessories', icon: '💡' },
] as const;

export type ShopType = typeof SHOP_TYPES[number]['id'];
export type CatalogScope = ShopType | 'universal';

export const SHOP_PRODUCT_CATEGORIES = {
  tent: ['Tents & Coverings', 'Chairs & Tables', 'Linen & Furnishings', 'Catering & Utensils'],
  electronics: ['Lighting', 'Fans & Appliances', 'Wiring & Fittings', 'Mobile & Audio Accessories'],
  universal: ['Universal · Packaging', 'Universal · Stationery', 'Universal · Essentials'],
};

export function isShopType(value: unknown): value is ShopType {
  return SHOP_TYPES.some(type => type.id === value);
}

/** Shops created before category selection were Kirana shops. */
export function getShopType(shop: { shopType?: unknown; businessType?: { name: string } | null }): ShopType {
  if (isShopType(shop.shopType)) return shop.shopType;
  const name = shop.businessType?.name.toLowerCase() || '';
  if (name.includes('tent')) return 'tent';
  if (name.includes('electr')) return 'electronics';
  return 'kirana';
}

export function shopTypeName(type: ShopType): string {
  return SHOP_TYPES.find(item => item.id === type)!.name;
}

export function shopEntryPath(shop: { id: string; catalogSetupComplete?: boolean }): string {
  return `/${encodeURIComponent(shop.id)}/${shop.catalogSetupComplete === false ? 'shop/catalog-setup' : 'billing'}`;
}
