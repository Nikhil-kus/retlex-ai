import { STARTER_CATALOG, type CatalogItem } from './starter-catalog';
import type { ShopType } from './shop-types';

export function prepareCatalogImport(input: unknown, shopType: ShopType): Omit<CatalogItem, 'id'> {
  if (!input || typeof input !== 'object') throw new Error('Invalid product');
  const submitted = input as Record<string, unknown>;
  // Resolve built-in entries on the server so stale/altered client prices and scopes cannot leak in.
  const seed = STARTER_CATALOG.find(p => p.id === submitted.id);
  const p = (seed || submitted) as Record<string, unknown>;
  const scope = p.shopType ?? 'kirana';
  if (scope !== shopType && scope !== 'universal') throw new Error('A selected product belongs to another shop category. Refresh the catalog.');
  if (typeof p.name !== 'string' || !p.name.trim()) throw new Error('Product name is required');
  const price = Number(p.price ?? 0);
  const costPrice = Number(p.costPrice ?? 0);
  const baseQuantity = Number(p.baseQuantity ?? 1);
  if (!Number.isFinite(price) || price < 0 || !Number.isFinite(costPrice) || costPrice < 0 || !Number.isFinite(baseQuantity) || baseQuantity <= 0) throw new Error('Invalid product price or quantity');
  const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null;
  const packetWeight = p.packetWeight == null ? null : Number(p.packetWeight);
  if (packetWeight !== null && (!Number.isFinite(packetWeight) || packetWeight <= 0)) throw new Error('Invalid packet weight');
  return {
    name: p.name.trim(), localName: text(p.localName),
    localAliases: Array.isArray(p.localAliases) ? p.localAliases.filter((a): a is string => typeof a === 'string') : [],
    price, costPrice, baseQuantity, baseUnit: text(p.baseUnit) || 'pc',
    packetWeight, packetUnit: text(p.packetUnit), barcode: text(p.barcode),
    category: text(p.category), imageUrl: text(p.imageUrl), shopType: scope === 'universal' ? 'universal' : shopType,
    ...(seed?.imageCredit ? { imageCredit: seed.imageCredit } : {}),
  };
}
