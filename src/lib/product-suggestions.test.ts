import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createProductSuggestions } from './product-suggestions';

const products = [
  { id: 'badam', name: 'Badam Packet 250g', localName: 'बादाम पैकेट', price: 195 },
  { id: 'badam-large', name: 'Badam Packet 500g', price: 380 },
  { id: 'loose', name: 'Badam Khula', price: 90 },
  { id: 'oil', name: 'Bajaj Almond Hair Oil 200ml', localName: 'बजाज बादाम तेल', price: 140 },
  { id: 'drink', name: 'Simply Namaste Badam Drink', price: 10 },
  { id: 'other-nut', name: 'Other Almonds 250g', price: 200 },
  { id: 'coriander', name: 'Everest Coriander Powder', localName: 'एवरेस्ट धनिया पाउडर' },
  { id: 'coriander2', name: 'Catch Coriander Powder', localName: 'कैच धनिया पाउडर' },
  { id: 'turmeric', name: 'Turmeric Powder', localName: 'हल्दी पाउडर' },
  { id: 'chilli', name: 'Chilli Powder', localName: 'मिर्च पाउडर' },
  { id: 'washing', name: 'Washing Powder', localName: 'वाशिंग पाउडर' },
  { id: 'milk', name: 'Cadbury Dairy Milk Chocolate 13g (₹10)', localName: 'कैडबरी डेयरी मिल्क चॉकलेट' },
  { id: 'milk-large', name: 'Cadbury Dairy Milk Chocolate 36g', localName: 'कैडबरी डेयरी मिल्क चॉकलेट' },
  { id: 'gold', name: 'Cadbury Dairy Milk Chocolate Gold 36g' },
  { id: 'mix', name: 'Dahi Vada Instant Mix', localName: 'दही वडा मिक्स' },
].map(p => ({ ...p, category: 'Everything' })); // Deliberately unreliable categories.
const engine = createProductSuggestions(products);
const ids = (items: { id: string }[]) => items.map(p => p.id).sort();

test('price requests show matching-price variants rather than hiding them behind other sizes', () => {
  const catalog = Array.from({ length: 12 }, (_, i) => ({ id: `soap-${i}`, name: `Dettol Soap ${i + 1}00g`, price: i < 10 ? 68 : 42 }));
  const choices = createProductSuggestions(catalog).suggest({ name: 'Dettol Soap', requestedPrice: 42 });
  assert.deepEqual(ids(choices.brandVariants), ['soap-10', 'soap-11']);
  assert.deepEqual(createProductSuggestions(catalog).suggest({ name: 'Dettol Soap', requestedPrice: 99 }).brandVariants, []);
});

test('almond packets exclude loose stock, oil and drinks despite shared words/categories', () => {
  const result = engine.suggest({ productId: 'badam', spokenWord: 'बादाम' });
  assert.deepEqual(ids(result.sizeVariants), ['badam-large']);
  assert.deepEqual(ids(result.brandVariants), ['other-nut']);
  assert.deepEqual(ids(engine.sizes(products[1])), ['badam']);
});

test('uncertain coriander powder keeps full identity instead of all powders', () => {
  const result = engine.suggest({ name: 'धनिया पाउडर' });
  assert.deepEqual(ids(result.brandVariants), ['coriander', 'coriander2']);
  assert.deepEqual(result.sizeVariants, []);
  assert.deepEqual(ids(engine.suggest({ productId: 'coriander' }).brandVariants), ['coriander2']);
});

test('dairy milk suggestions do not drift to instant mixes; qualifiers are not pack sizes', () => {
  const result = engine.suggest({ name: 'डेरी मिल्क' });
  assert.ok(result.brandVariants.length > 0);
  assert.ok(result.brandVariants.every(p => /Dairy Milk/.test(p.name)));
  assert.deepEqual(ids(engine.sizes(products.find(p => p.id === 'milk')!)), ['milk-large']);
});

test('unknown words do not become recommendations through a shared generic word', () => {
  assert.deepEqual(engine.suggest({ name: 'zorbax powder' }).brandVariants, []);
});

test('safe candidates remain available for explicit pack-size confirmation', () => {
  assert.ok(engine.suggest({ name: 'Badam', sourceRawText: 'Badam packet', parsedQty: 100, parsedUnit: 'g' }).brandVariants.some(p => p.id === 'badam'));
});

test('saved catalogue reproductions retain relevant choices across inconsistent categories', () => {
  const catalog = JSON.parse(readFileSync('krishna-products-catalog.json', 'utf8'));
  const suggestions = createProductSuggestions(catalog);
  for (const [name, expected] of [['धनिया पाउडर', /Coriander Powder/i], ['डेरी मिल्क', /Dairy Milk/i]] as const) {
    const choices = suggestions.suggest({ name }).brandVariants;
    assert.ok(choices.length > 0, name);
    assert.ok(choices.every(p => expected.test(p.name)), JSON.stringify(choices));
  }
});

test('same brand prefix and missing categories are not enough to invent alternatives', () => {
  const unknown = createProductSuggestions([{ id: 'a', name: 'Acme Widget 100g' }, { id: 'b', name: 'Acme Widget Plus 100g' }, { id: 'c', name: 'Acme Widget 200g' }]);
  assert.deepEqual(ids(unknown.suggest({ productId: 'a' }).sizeVariants), ['c']);
  assert.deepEqual(unknown.suggest({ productId: 'a' }).brandVariants, []);
});
