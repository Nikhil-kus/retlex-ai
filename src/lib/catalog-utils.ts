import type { CatalogItem } from './starter-catalog';
import { isShopType, type ShopType } from './shop-types';

export type StoredCatalogItem = Partial<CatalogItem> & { id: string; name: string; shopId?: string };

/** Resolve old products from their owning shop; untagged legacy catalog = Kirana. */
export function catalogScope(item: StoredCatalogItem, shopTypes: Map<string, ShopType>) {
  if (item.shopType === 'universal' || isShopType(item.shopType)) return item.shopType;
  return item.shopId ? shopTypes.get(item.shopId) || 'kirana' : 'kirana';
}

export function mergeCatalog(items: StoredCatalogItem[], type: ShopType, shopTypes = new Map<string, ShopType>()): StoredCatalogItem[] {
  const catalog = new Map<string, StoredCatalogItem>();
  const score = (p: StoredCatalogItem) => (p.imageUrl ? 4 : 0) + (p.localName ? 2 : 0) + (p.category && p.category !== 'Kirana Essentials' ? 2 : 0) + ((p.price || 0) > 0 ? 1 : 0);
  for (const item of items) {
    const scope = catalogScope(item, shopTypes);
    if (scope !== type && scope !== 'universal') continue;
    const key = item.name?.trim().toLowerCase();
    if (!key) continue;
    const existing = catalog.get(key);
    if (!existing || score(item) > score(existing)) {
      // Only public catalog fields are returned, never another shop's metadata.
      catalog.set(key, {
        id: item.id, name: item.name, localName: item.localName || null,
        localAliases: item.localAliases || [], price: item.price || 0, costPrice: 0,
        baseUnit: item.baseUnit || 'pc', baseQuantity: item.baseQuantity || 1,
        packetWeight: item.packetWeight || null, packetUnit: item.packetUnit || null,
        barcode: item.barcode || null, category: item.category || null,
        imageUrl: item.imageUrl || null, shopType: scope,
        ...(item.imageCredit ? { imageCredit: item.imageCredit } : {}),
      });
    }
  }
  return [...catalog.values()].sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name));
}
