import assert from 'node:assert/strict';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { STARTER_CATALOG } from '../src/lib/starter-catalog';
import { db } from '../src/lib/firebase';
import { doc, getDoc, getDocs, collection, query, where, writeBatch } from 'firebase/firestore';

const base = process.env.RETLEX_TEST_URL || 'http://127.0.0.1:3000';
const fixtureFile = 'scratch/shop-catalog-fixtures.json';
type Fixture = { id: string; name: string; shopType: string };
async function request(route: string, body?: unknown, method = 'POST') {
  const response = await fetch(`${base}${route}`, body === undefined ? {} : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  assert.ok(response.ok, `${route}: ${response.status} ${JSON.stringify(data)}`);
  return data;
}
async function cleanup() {
  const fixtures: Fixture[] = JSON.parse(await readFile(fixtureFile, 'utf8'));
  for (const fixture of fixtures) {
    const shopRef = doc(db, 'shops', fixture.id);
    const shop = await getDoc(shopRef);
    if (!shop.exists()) continue;
    assert.ok(fixture.name.startsWith('Retlex catalog verification '));
    assert.equal(shop.data().name, fixture.name, 'Refusing to remove a shop whose identity changed');
    assert.equal(shop.data().mobile, '0000000000');
    const products = await getDocs(query(collection(db, 'products'), where('shopId', '==', fixture.id)));
    const bills = await getDocs(query(collection(db, 'bills'), where('shopId', '==', fixture.id)));
    assert.equal(bills.size, 0, 'Refusing to remove a fixture with saved bills');
    const batch = writeBatch(db);
    products.docs.forEach(product => batch.delete(product.ref));
    batch.delete(shopRef);
    await batch.commit();
    console.log(`Removed test shop and ${products.size} test products: ${fixture.shopType}`);
  }
  await unlink(fixtureFile);
}
async function main() {
  if (process.argv.includes('--cleanup')) return cleanup();
  assert.equal(await readFile(fixtureFile).then(() => true, () => false), false, 'Clean up previous fixtures first');
  const fixtures: Fixture[] = [];
  try {
    for (const type of ['tent', 'electronics'] as const) {
      const shop = await request('/api/shops', { name: `Retlex catalog verification ${type} ${Date.now()}`, mobile: '0000000000', address: 'Temporary automated verification', shopType: type });
      fixtures.push({ id: shop.id, name: shop.name, shopType: type });
      await writeFile(fixtureFile, JSON.stringify(fixtures, null, 2));
      assert.equal(shop.shopType, type);
      assert.equal(shop.catalogSetupComplete, false);
      const catalog = await request(`/api/global-catalog?shopId=${shop.id}`);
      assert.ok(catalog.every((p: { shopType: string }) => p.shopType === type || p.shopType === 'universal'));
      assert.equal(catalog.filter((p: { shopType: string }) => p.shopType === 'universal').length, 8);
      const products = [catalog.find((p: { shopType: string }) => p.shopType === type), catalog.find((p: { id: string }) => p.id === 'starter_universal_pen')];
      const imported = await request('/api/global-catalog/import', { shopId: shop.id, products });
      assert.equal(imported.imported, 2);
      const duplicate = await request('/api/global-catalog/import', { shopId: shop.id, products });
      assert.equal(duplicate.imported, 0);
      assert.equal(duplicate.skipped, 2);
      const persisted = await request(`/api/products?shopId=${shop.id}`);
      assert.equal(persisted.length, 2);
      assert.ok(persisted.every((p: { shopId: string; baseUnit: string; price: number }) => p.shopId === shop.id && p.baseUnit === 'pc' && p.price > 0));
      const wrongScope = await fetch(`${base}/api/global-catalog/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopId: shop.id, products: [STARTER_CATALOG.find(p => p.shopType === (type === 'tent' ? 'electronics' : 'tent'))] }) });
      assert.equal(wrongScope.status, 400);
      assert.equal((await request(`/api/products?shopId=${shop.id}`)).length, 2);
      console.log(`PASS ${type}: create → filtered catalog → import → duplicate skip → persisted products → reject other category`);
    }
    // Test completion without changing the profile and leave Tent pending for browser checks.
    const electronics = fixtures.find(p => p.shopType === 'electronics')!;
    const finished = await request(`/api/shops/${electronics.id}`, { catalogSetupComplete: true }, 'PUT');
    assert.equal(finished.catalogSetupComplete, true);
    assert.equal(finished.name, electronics.name);
    console.log('PASS completion preserves shop profile');
    if (process.argv.includes('--keep')) console.log(JSON.stringify(fixtures));
    else await cleanup();
  } catch (error) {
    if (fixtures.length) await cleanup();
    throw error;
  }
}
main().then(() => process.exit(0)).catch(error => { console.error(error); process.exit(1); });
