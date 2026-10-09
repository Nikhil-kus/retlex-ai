import test from 'node:test';
import assert from 'node:assert/strict';
import { demoQueries, demoShops, getDemoProducts, resolveDemoQuery } from './demo-data';

test('the advertised examples resolve, while unsupported searches cannot invent results', () => {
  assert.equal(resolveDemoQuery(demoQueries.shirts), 'shirts');
  assert.equal(resolveDemoQuery(demoQueries.groceries), 'groceries');
  assert.equal(resolveDemoQuery('WHITE   SHIRTS nearby'), 'shirts');
  for (const query of ['', 'coffee near me', 'milk near me', 'brown bread', 'shirt']) assert.equal(resolveDemoQuery(query), null);
});

test('shirt comparison spans all three stores and sorts prices in both directions', () => {
  const ascending = getDemoProducts('shirts', null);
  assert.equal(ascending.length, 6);
  assert.deepEqual([...new Set(ascending.map(product => product.shop))].sort(), [0, 1, 2]);
  assert.equal(ascending[0].price, 399);
  assert.equal(getDemoProducts('shirts', null, 'price-desc')[0].price, 899);
  assert.deepEqual(ascending.map(product => product.id), getDemoProducts('shirts', null, 'price-desc').map(product => product.id).reverse());
});

test('retailer filtering and distance sorting preserve the right shop association', () => {
  for (let shop = 0; shop < 3; shop++) {
    const products = getDemoProducts('shirts', shop);
    assert.equal(products.length, 2);
    assert.ok(products.every(product => product.shop === shop));
  }
  const distances = getDemoProducts('shirts', null, 'distance').map(product => demoShops.shirts[product.shop].distance);
  assert.deepEqual(distances, [0.4, 0.4, 0.8, 0.8, 1.2, 1.2]);
});

test('every grocery catalog contains both milk brands and both bread sizes', () => {
  assert.deepEqual(getDemoProducts('groceries', null), []);
  for (let shop = 0; shop < 3; shop++) {
    const products = getDemoProducts('groceries', shop);
    assert.equal(products.length, 4);
    assert.ok(products.every(product => product.shop === shop));
    assert.deepEqual(products.map(product => product.id).sort(), ['amul', 'bread-200', 'bread-400', 'sanchi']);
  }
  assert.equal(getDemoProducts('groceries', 1).find(product => product.id === 'sanchi')?.stock, 0);
  assert.ok(getDemoProducts('groceries', 0).every(product => product.stock > 0));
});

test('sorting and selecting a shop never mutate another catalog', () => {
  const before = getDemoProducts('groceries', 0);
  getDemoProducts('groceries', 2, 'price-desc');
  getDemoProducts('groceries', 1, 'distance');
  assert.deepEqual(getDemoProducts('groceries', 0), before);
});
