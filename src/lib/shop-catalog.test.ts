import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { SHOP_TYPES, getShopType, shopEntryPath } from './shop-types';
import { STARTER_CATALOG } from './starter-catalog';
import { mergeCatalog } from './catalog-utils';
import { prepareCatalogImport } from './catalog-import';

test('each shop gets only its own products plus every universal item', () => {
  const universal = STARTER_CATALOG.filter(p => p.shopType === 'universal');
  assert.equal(universal.length, 8);
  for (const type of SHOP_TYPES) {
    const catalog = mergeCatalog(STARTER_CATALOG, type.id);
    assert.ok(catalog.some(p => p.shopType === type.id));
    assert.ok(catalog.every(p => p.shopType === type.id || p.shopType === 'universal'));
    for (const p of universal) assert.ok(catalog.some(item => item.id === p.id));
  }
  assert.equal(mergeCatalog(STARTER_CATALOG, 'tent').length, 20);
  assert.equal(mergeCatalog(STARTER_CATALOG, 'electronics').length, 24);
});

test('legacy shop products stay in their original category and private metadata is omitted', () => {
  const catalog = mergeCatalog([
    { id: 'grocery', name: 'Rice', shopId: 'old-shop', price: 50, costPrice: 30 },
    { id: 'tent', name: 'Chair', shopId: 'tent-shop' },
    { id: 'electronic', name: 'Charger', shopId: 'electronics-shop' },
  ], 'tent', new Map([['tent-shop', 'tent'], ['electronics-shop', 'electronics']]));
  assert.deepEqual(catalog.map(p => p.name), ['Chair']);
  assert.equal(catalog[0].shopId, undefined);
  assert.equal(catalog[0].costPrice, 0);
  assert.equal(getShopType({}), 'kirana');
  assert.equal(getShopType({ businessType: { name: 'Tent House' } }), 'tent');
});

test('a richer live Kirana item keeps its own ID and data when replacing a starter', () => {
  const starter = STARTER_CATALOG.find(p => p.shopType === 'kirana')!;
  const live = { ...starter, id: 'live-id', category: 'Grains & Cereals', price: 321, imageUrl: '/real-product.jpg' };
  const catalog = mergeCatalog([starter, live, { ...live, id: 'duplicate', name: ` ${live.name.toUpperCase()} ` }], 'kirana');
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].id, 'live-id');
  const imported = prepareCatalogImport(catalog[0], 'kirana');
  assert.equal(imported.price, 321);
  assert.equal(imported.imageUrl, '/real-product.jpg');
});

test('import prevents cross-category selections and validates all prices before writing', () => {
  const tent = STARTER_CATALOG.find(p => p.shopType === 'tent')!;
  assert.throws(() => prepareCatalogImport(tent, 'electronics'), /another shop category/);
  assert.throws(() => prepareCatalogImport({ ...tent, shopType: 'universal' }, 'electronics'), /another shop category/);
  for (const price of [-1, Infinity, 'not-a-price']) {
    assert.throws(() => prepareCatalogImport({ id: 'custom', name: 'Lamp', shopType: 'electronics', price }, 'electronics'), /Invalid product price/);
  }
  assert.throws(() => prepareCatalogImport(null, 'kirana'), /Invalid product/);
});

test('universal imports are independent and retain billing fields and Hindi aliases', () => {
  const source = STARTER_CATALOG.find(p => p.id === 'starter_universal_pen')!;
  const first = prepareCatalogImport(source, 'tent');
  const second = prepareCatalogImport(source, 'electronics');
  first.name = 'My Pen';
  first.localAliases.push('my pen');
  assert.equal(source.name, 'Ballpoint Pen');
  assert.equal(second.name, 'Ballpoint Pen');
  assert.ok(!second.localAliases.includes('my pen'));
  assert.equal(second.baseUnit, 'pc');
  assert.equal(second.baseQuantity, 1);
  assert.ok(second.localName);
  assert.equal(second.shopType, 'universal');
  assert.equal(second.price * 3, 30);
});

test('returning owners resume unfinished setup; existing shops keep billing access', () => {
  assert.equal(shopEntryPath({ id: 'new-shop', catalogSetupComplete: false }), '/new-shop/shop/catalog-setup');
  assert.equal(shopEntryPath({ id: 'old-shop' }), '/old-shop/billing');
  assert.equal(shopEntryPath({ id: 'ready', catalogSetupComplete: true }), '/ready/billing');
});

test('all 36 new items have local photos, attribution, and valid billing defaults', () => {
  const products = STARTER_CATALOG.filter(p => p.shopType !== 'kirana');
  assert.equal(products.length, 36);
  assert.equal(new Set(STARTER_CATALOG.map(p => p.id)).size, STARTER_CATALOG.length);
  for (const p of products) {
    assert.ok(p.imageUrl?.startsWith('/catalog-images/'), p.name);
    const file = path.join(process.cwd(), 'public', p.imageUrl!);
    assert.ok(existsSync(file), p.name);
    const bytes = readFileSync(file);
    assert.equal(bytes[0], 0xff, p.name);
    assert.equal(bytes[1], 0xd8, p.name);
    assert.ok(p.imageCredit?.sourceUrl.startsWith('https://commons.wikimedia.org/'), p.name);
    assert.ok(p.imageCredit?.license, p.name);
    assert.ok(p.price > 0 && p.baseQuantity > 0 && p.localAliases.length > 0, p.name);
  }
});
