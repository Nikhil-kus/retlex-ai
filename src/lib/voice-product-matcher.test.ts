import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createVoiceProductMatcher, normalizeVoiceName, voiceQuantityForProduct, type VoiceProduct } from './voice-product-matcher';
import { transpileModule, ScriptTarget } from 'typescript';
import { parseVoiceItems } from './voice-parser';
import { createProductSuggestions } from './product-suggestions';

const products = [
  { id: 'parle', name: 'ParleG Biscuit', localName: 'पारले-जी बिस्किट', price: 5, baseUnit: 'pc' },
  { id: 'patanjali', name: 'Patanjali Milk Shakti Biscuit (Bulk 48 pcs)', localName: 'पतंजलि मिल्क शक्ति बिस्किट', price: 200, baseUnit: 'pc', localAliases: ['मिल्क शक्ति बिस्किट', 'बिस्किट'] },
  { id: 'parle-bulk', name: 'Parle-G Biscuit (Bulk 56 pcs)', localName: 'पारले-जी बिस्किट बल्क', baseUnit: 'pc' },
  { id: 'gold', name: 'Parle-G Gold Biscuit', localName: 'पारले-जी गोल्ड बिस्किट', baseUnit: 'pc' },
  { id: 'bourbon', name: 'Parle Bourbon Biscuit', localName: 'पारले बॉर्बन बिस्किट', baseUnit: 'pc' },
  { id: 'oreo', name: 'Oreo Biscuit', localName: 'ओरियो बिस्किट', baseUnit: 'pc' },
  { id: 'nirma', name: 'Nirma Soap', localName: 'निरमा साबुन', baseUnit: 'pc' },
  { id: 'lux', name: 'Lux Soap', localName: 'लक्स साबुन', baseUnit: 'pc' },
  { id: 'dettol', name: 'Dettol Soap', localName: 'डिटॉल साबुन', baseUnit: 'pc' },
  { id: 'coriander', name: 'Coriander Loose', localName: 'धनिया खुला', localAliases: ['धनिया', 'dhaniya'], baseUnit: 'kg', baseQuantity: 1 },
  { id: 'salt', name: 'Tata Salt 1 kg', localName: 'टाटा नमक', baseUnit: 'pc', packetWeight: 1, packetUnit: 'kg' },
  { id: 'other-salt', name: 'Aashirvaad Salt 1 kg', localName: 'आशीर्वाद नमक', baseUnit: 'pc', packetWeight: 1, packetUnit: 'kg' },
];
const matcher = createVoiceProductMatcher(products);

// Relevant product names, aliases and sale units from the reported shop catalogue.
const pulseProducts = [
  { id: 'kabuli', name: 'Kabuli Chana Khula', localName: 'काबुली चना खुला',
    localAliases: ['छोला', 'चोला', 'काबुली चना', 'सफेद चना', 'छोले', 'काबुली छोले', 'काबुली चने'],
    price: 120, baseUnit: 'kg', baseQuantity: 1 },
  { id: 'lobia', name: 'Lobiya Khula', localName: 'लोबिया खुला',
    localAliases: ['लोबिया', 'खुला लोबिया', 'चौला', 'चौलाई', 'सफेद लोबिया'], price: 90, baseUnit: 'kg', baseQuantity: 1 },
  { id: 'pushp-masala', name: 'Pushp Chhole Masala 100g', localName: 'पुष्प छोले मसाला',
    localAliases: ['छोले मसाला', 'पुष्प मसाला', 'पुष्प छोले', 'छोले का मसाला'], price: 0, baseUnit: 'pkt', baseQuantity: 100, packetWeight: 100, packetUnit: 'g' },
  { id: 'catch-masala', name: 'Catch Chhole Masala 50g', localName: 'कैच छोले मसाला',
    localAliases: ['छोले मसाला', 'कैच छोले', 'कैच मसाला', 'छोले का मसाला'], price: 42, baseUnit: 'g', baseQuantity: 50, packetWeight: 50, packetUnit: 'g' },
];

test('bare chhole selects whole chickpeas and excludes lobia and masala before ranking', () => {
  for (const catalog of [pulseProducts, [...pulseProducts].reverse()]) {
    const engine = createVoiceProductMatcher(catalog);
    for (const spoken of ['छोले एक किलो', 'chhole 1 kg', 'chole 1 kg', 'छोला आधा किलो', 'छोले', 'छोले 100 ग्राम']) {
      const request = parseVoiceItems(spoken)[0];
      const result = engine.match(request, 'lobia');
      assert.equal(result.product?.id, 'kabuli', spoken);
      assert.deepEqual(result.candidates.map(c => c.product.id), ['kabuli'], spoken);
      const suggestions = createProductSuggestions(catalog).suggest({ name: request.name, parsedQty: request.quantity, parsedUnit: request.unit });
      assert.deepEqual(suggestions.brandVariants.map(p => p.id), ['kabuli'], spoken);
    }
    for (const spoken of ['लोबिया एक किलो', 'चौला एक किलो', 'lobia 1 kg']) {
      assert.equal(engine.match(parseVoiceItems(spoken)[0]).product?.id, 'lobia', spoken);
    }
  }
});

test('explicit masala and genuine chickpea ambiguity still require the correct product', () => {
  const engine = createVoiceProductMatcher(pulseProducts);
  assert.equal(engine.match(parseVoiceItems('कैच छोले मसाला 50 ग्राम')[0]).product?.id, 'catch-masala');
  const masala = engine.match(parseVoiceItems('छोले मसाला 100 ग्राम')[0]);
  assert.equal(masala.product?.id, 'pushp-masala');
  assert.ok(masala.candidates.every(c => /Masala/.test(c.product.name)));
  assert.equal(engine.match(parseVoiceItems('unknownbrand छोले एक किलो')[0]).product, null);
  assert.equal(createVoiceProductMatcher(pulseProducts.slice(1)).match(parseVoiceItems('छोले एक किलो')[0]).product, null);
  const duplicate = createVoiceProductMatcher([...pulseProducts, { ...pulseProducts[0], id: 'other-kabuli' }]);
  assert.equal(duplicate.match(parseVoiceItems('छोले एक किलो')[0]).product, null);
});

test('aliases, price and even a matching kilo size cannot substitute a different grocery type', () => {
  const wrong = [
    { ...pulseProducts[1], localAliases: ['छोले'], price: 120 },
    { ...pulseProducts[2], name: 'Chhole Masala 1kg', localAliases: ['छोले'], price: 120, packetWeight: 1, packetUnit: 'kg' },
    { id: 'flour', name: 'Chickpea Flour', localAliases: ['छोले'], baseUnit: 'kg', baseQuantity: 1, price: 120 },
  ];
  const engine = createVoiceProductMatcher([pulseProducts[0], ...wrong]);
  for (const spoken of ['छोले एक किलो', 'छोले ₹120']) {
    assert.equal(engine.match(parseVoiceItems(spoken)[0]).product?.id, 'kabuli');
  }
  const suggestions = createProductSuggestions([pulseProducts[0], ...wrong]).suggest({ productId: 'kabuli', spokenWord: 'छोले' });
  assert.deepEqual(suggestions, { brandVariants: [], sizeVariants: [] });
});

const pricedProducts = [
  { id: 'sugar', name: 'Sugar Loose', localName: 'चीनी', price: 45, baseUnit: 'kg', baseQuantity: 1 },
  { id: 'small-colgate', name: 'Colgate Toothpaste 50g', localName: 'कोलगेट', price: 30, baseUnit: 'pc' },
  { id: 'large-colgate', name: 'Colgate Toothpaste 100g', localName: 'कोलगेट', price: 60, baseUnit: 'pc' },
  { id: 'silk', name: 'Dairy Milk Silk', localName: 'डेरी मिल्क सिल्क', localAliases: ['डेरी मिल्क'], price: 55, baseUnit: 'pc' },
];

test('screenshot: exact shop alias and price select Cool over a fuzzy same-price Skincare match', () => {
  const cool = { id: 'cool', name: 'Dettol Soap Cool 75g', localName: 'डिटॉल कूल साबुन',
    localAliases: ['डिटॉल साबुन', 'डिटोल साबुन', 'डिटॉल कूल', 'डेटॉल साबुन', 'डिटॉल सोप', 'डिटोल सोप'], price: 42, baseUnit: 'g' };
  const skincare = { id: 'skincare', name: 'Dettol Soap Skincare 75g', localName: 'डिटॉल स्किनकेयर साबुन',
    localAliases: ['डिटॉल साबुन', 'डिटोल साबुन', 'डिटॉल स्किनकेयर', 'डिटोल स्किनकेयर', 'डिटॉल सोप'], price: 42, baseUnit: 'g' };
  for (const catalog of [[cool, skincare], [skincare, cool]]) {
    const engine = createVoiceProductMatcher(catalog);
    for (const spoken of ['₹42 डेटॉल साबुन | अच्छा', 'डेटॉल साबुन बयालीस रुपये']) {
      const parsed = parseVoiceItems(spoken)[0];
      assert.equal(parsed.requestedPrice, 42);
      assert.equal(engine.match(parsed).product?.id, 'cool');
    }
    assert.equal(engine.match(parseVoiceItems('डेटॉल साबुन')[0]).product, null);
    assert.equal(engine.match(parseVoiceItems('₹42 डिटॉल साबुन')[0]).product?.id, 'cool');
    assert.equal(engine.match(parseVoiceItems('₹42 डिटॉल साबुन')[0], 'skincare').product?.id, 'skincare');
  }
  // The same rule applies to unrelated brands and aliases, without brand exceptions.
  const tea = createVoiceProductMatcher([
    { id: 'exact', name: 'Acme Premium Tea', localAliases: ['acme tea'], price: 50 },
    { id: 'fuzzy', name: 'Acme Strong Tea', localAliases: ['acmee tea'], price: 50 },
  ]);
  assert.equal(tea.match(parseVoiceItems('acme tea fifty rupees')[0]).product?.id, 'exact');
});

test('spoken prices resolve the same product as weight and select a priced pack', () => {
  const priced = createVoiceProductMatcher(pricedProducts);
  for (const sentence of ['चीनी पैंतालीस रुपये', 'चीनी ४५ रुपए', 'चीनी ₹45', 'चीनी एक किलो']) {
    const items = parseVoiceItems(sentence);
    assert.equal(items.length, 1, sentence);
    assert.equal(priced.match(items[0]).product?.id, 'sugar', sentence);
    assert.equal(items[0].quantity, 1);
  }
  for (const sentence of ['कोलगेट तीस रुपए', 'तीस रुपये वाला कोलगेट', 'colgate thirty rupees', 'colgate rs. 30']) {
    const items = parseVoiceItems(sentence);
    assert.equal(items.length, 1, sentence);
    assert.equal(items[0].requestedPrice, 30, sentence);
    assert.equal(priced.match(items[0]).product?.id, 'small-colgate', sentence);
    assert.equal(items[0].quantity, 1);
    assert.equal(items[0].hasExplicitQty, false);
  }
  assert.equal(priced.match(parseVoiceItems('कोलगेट तीस रुपए')[0], 'large-colgate').product?.id, 'small-colgate');
  assert.equal(priced.match(parseVoiceItems('कोलगेट चालीस रुपये')[0]).product, null);
  assert.equal(priced.match(parseVoiceItems('कोलगेट सौ ग्राम तीस रुपये')[0]).product, null);
  const duplicates = createVoiceProductMatcher([...pricedProducts, { ...pricedProducts[1], id: 'duplicate' }]);
  assert.equal(duplicates.match(parseVoiceItems('कोलगेट तीस रुपए')[0]).product?.id, 'duplicate');
});

test('prices stay separate from quantities across multiple spoken products', () => {
  const parsed = parseVoiceItems('चीनी पैंतालीस रुपये और कोलगेट तीस रुपए दो पैकेट');
  assert.deepEqual(parsed.map(i => [i.name, i.requestedPrice, i.quantity]), [['चीनी', 45, 1], ['कोलगेट', 30, 2]]);
  const trailing = parseVoiceItems('कोलगेट दो पैकेट तीस रुपए');
  assert.equal(trailing.length, 1);
  assert.equal(trailing[0].requestedPrice, 30);
  assert.equal(trailing[0].quantity, 2);
  assert.equal(parseVoiceItems('चाय एक सौ पैंतालीस रुपये')[0].requestedPrice, 145);
  assert.equal(parseVoiceItems('tea forty five rupees')[0].requestedPrice, 45);
});

test('currency-first price leaves a following quantity on the same product', () => {
  for (const spoken of [
    'डेरी मिल्क ₹55 तीन पैकेट', 'डेरी मिल्क ₹55 3 पैकेट',
    'डेरी मिल्क ₹ ५५ तीन पैकेट', '₹55 डेरी मिल्क तीन पैकेट',
    'डेरी मिल्क पचपन रुपये तीन पैकेट', 'डेरी मिल्क तीन पैकेट ₹55',
  ]) {
    const parsed = parseVoiceItems(spoken);
    assert.equal(parsed.length, 1, spoken);
    assert.equal(parsed[0].name, 'डेरी मिल्क', spoken);
    assert.equal(parsed[0].requestedPrice, 55, spoken);
    assert.equal(parsed[0].quantity, 3, spoken);
    assert.equal(parsed[0].unit, 'pc', spoken);
    assert.equal(parsed[0].hasExplicitQty, true, spoken);
  }
});

test('reported sentence resolves the correct identity with quantity and packet intent intact', () => {
  const parsed = parseVoiceItems('परले-ग बिस्किट दो पैकेट');
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].quantity, 2);
  assert.match(parsed[0].rawText, /पैकेट/);
  const result = matcher.match(parsed[0]);
  assert.equal(result.product?.id, 'parle', JSON.stringify(result));
});

test('brand, script, spacing and spelling variations work across unrelated products', () => {
  for (const [query, expected] of [
    ['parle-g biscuit', 'parle'], ['parleg biscuit', 'parle'], ['पारले जी बिस्कुट', 'parle'],
    ['परले-ग बिस्किट', 'parle'], ['nirma soap', 'nirma'], ['निरमा साबुन', 'nirma'],
    ['निरमा sabun', 'nirma'], ['lux soap', 'lux'], ['dettol soapp', 'dettol'],
    ['टाटा नमक', 'salt'], ['tata salt', 'salt'], ['धनिया', 'coriander'],
    ['parle bourbon biscuit', 'bourbon'], ['parle g gold biscuit', 'gold'],
  ]) assert.equal(matcher.match({ name: query }).product?.id, expected, query);
});

test('unknown brands cannot be replaced using only a shared category word', () => {
  for (const query of ['xyz biscuit', 'zorbax soap', 'unknown tata salt']) {
    assert.equal(matcher.match({ name: query }).product, null, query);
  }
});

test('bulk requires explicit intent across brands', () => {
  assert.equal(matcher.match({ name: 'parle g biscuit', rawText: 'parle g biscuit bulk' }).product?.id, 'parle-bulk');
  assert.equal(matcher.match({ name: 'patanjali milk shakti biscuit' }).product, null);
  assert.equal(matcher.match({ name: 'patanjali milk shakti biscuit bulk' }).product?.id, 'patanjali');
  assert.equal(matcher.match({ name: 'parle g biscuit', rawText: 'parle g biscuit 24 pcs', quantity: 24, unit: 'pc' }).product?.id, 'parle');
  const bundles = createVoiceProductMatcher([
    { id: 'single', name: 'Nirma Beauty Soap' }, { id: 'bundle', name: 'Nirma Beauty Soap - 4 Pack' },
  ]);
  assert.equal(bundles.match({ name: 'nirma beauty soap' }).product?.id, 'single');
  assert.equal(bundles.match({ name: 'nirma beauty soap 4 pack' }).product?.id, 'bundle');
});

test('ambiguous sizes require selection; exact requested weight resolves them', () => {
  const sizes = createVoiceProductMatcher([
    { id: 'small', name: 'Acme Tea 100g', baseUnit: 'pc' },
    { id: 'large', name: 'Acme Tea 250g', baseUnit: 'pc' },
    { id: 'wrong-brand', name: 'Other Tea 250g', baseUnit: 'pc' },
  ]);
  assert.equal(sizes.match({ name: 'acme tea' }).product, null);
  assert.equal(sizes.match({ name: 'acme tea 250g' }).product?.id, 'large');
  assert.equal(sizes.match({ name: 'acme tea', unit: 'g', quantity: 250 }).product?.id, 'large');
  assert.equal(sizes.match({ name: 'acme tea', unit: 'ml', quantity: 250 }).product, null);
  assert.equal(sizes.match({ name: 'acme tea', unit: 'g', quantity: 200 }).product, null);
});

test('generic words and duplicate products are uncertain, not high confidence', () => {
  assert.equal(matcher.match({ name: 'soap' }).product, null);
  const duplicates = createVoiceProductMatcher([products[0], { ...products[0], id: 'duplicate' }]);
  assert.equal(duplicates.match({ name: 'parle g biscuit' }).product, null);
  const unequal = createVoiceProductMatcher([
    { id: 'short', name: 'Oreo Biscuit' }, { id: 'long', name: 'Patanjali Milk Shakti Biscuit' },
  ]);
  assert.equal(unequal.match({ name: 'biscuit' }).product, null);
  const brandOnly = createVoiceProductMatcher([
    { id: 'soap', name: 'Nirma Soap' }, { id: 'powder', name: 'Nirma Washing Powder' },
  ]);
  assert.equal(brandOnly.match({ name: 'nirma' }).product, null);
});

test('saved choices break genuine ties but cannot override a mismatched brand or size', () => {
  assert.equal(matcher.match({ name: 'soap' }, 'lux').product?.id, 'lux');
  assert.equal(matcher.match({ name: 'nirma soap' }, 'lux').product?.id, 'nirma');
  const sizes = createVoiceProductMatcher([
    { id: 'small', name: 'Acme Tea 100g' }, { id: 'large', name: 'Acme Tea 250g' },
  ]);
  assert.equal(sizes.match({ name: 'acme tea', unit: 'g', quantity: 250 }, 'small').product?.id, 'large');
});

test('adding duplicate aliases cannot inflate a wrong product score', () => {
  const wrong = { ...products[1], localAliases: Array(100).fill('बिस्किट') };
  const result = createVoiceProductMatcher([wrong, products[0]]).match({ name: 'परले-ग बिस्किट' });
  assert.equal(result.product?.id, 'parle');
});

test('candidate retention is independent of catalogue order and the old top-15 cutoff', () => {
  const decoys = Array.from({ length: 80 }, (_, i) => ({ id: `decoy-${i}`, name: `Brand${i} Biscuit`, localAliases: ['बिस्किट'] }));
  for (const catalog of [[...decoys, products[0]], [products[0], ...decoys].reverse()]) {
    assert.equal(createVoiceProductMatcher(catalog).match({ name: 'परले-ग बिस्किट' }).product?.id, 'parle');
  }
});

test('parser keeps fractional weights and multi-item quantities', () => {
  const parsed = parseVoiceItems('धनिया आधा किलो और निरमा साबुन दो पैकेट');
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].quantity, 0.5);
  assert.equal(parsed[0].unit, 'kg');
  assert.equal(parsed[1].quantity, 2);
  assert.equal(matcher.match(parsed[0]).product?.id, 'coriander');
  assert.equal(matcher.match(parsed[1]).product?.id, 'nirma');
  assert.equal(matcher.match({ name: 'धनिया खुला', rawText: 'धनिया खुला आधा किलो', unit: 'kg', quantity: 0.5 }).product?.id, 'coriander');
});

test('the saved shop catalogue resolves the reported spelling without a product exception', () => {
  const catalog: VoiceProduct[] = JSON.parse(readFileSync('krishna-products-catalog.json', 'utf8'));
  const result = createVoiceProductMatcher(catalog).match(parseVoiceItems('परले-ग बिस्किट दो पैकेट')[0]);
  assert.equal(result.product?.name, 'Parle-G Biscuit', JSON.stringify(result));
});

test('weight and volume convert to packets consistently; loose goods retain their units', () => {
  assert.deepEqual(voiceQuantityForProduct(250, 'g', { id: 'tea', name: 'Acme Tea 250g', baseUnit: 'pc' }), { quantity: 1, unit: 'pc' });
  assert.deepEqual(voiceQuantityForProduct(1, 'kg', { id: 'tea', name: 'Acme Tea', baseUnit: 'pkt', packetWeight: 250, packetUnit: 'g' }), { quantity: 4, unit: 'pkt' });
  assert.deepEqual(voiceQuantityForProduct(500, 'ml', { id: 'oil', name: 'Acme Oil', baseUnit: 'pc', packetWeight: 0.5, packetUnit: 'l' }), { quantity: 1, unit: 'pc' });
  assert.deepEqual(voiceQuantityForProduct(250, 'g', products[9]), { quantity: 0.25, unit: 'kg' });
  assert.equal(matcher.match({ name: 'nirma soap', quantity: 100, unit: 'g' }).product, null);
  assert.equal(matcher.match({ name: 'धनिया', quantity: 100, unit: 'ml' }).product, null);
});

test('actual billing pipeline preserves quantity, rejects unknown names, and updates cached interim results', () => {
  const source = readFileSync('src/app/billing/page.tsx', 'utf8');
  const start = source.indexOf('  const processVoiceTextToItems =');
  const end = source.indexOf('  const getSuggestions =', start);
  assert.ok(start >= 0 && end > start);
  const javascript = transpileModule(source.slice(start, end), { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText;
  const processVoiceText = new Function('parseVoiceItems', 'voiceQuantityForProduct', 'voiceMatcherRef', 'matchCacheRef', '_isDebug', 'normalizeVoiceName', 'debugDataRef', `${javascript}; return processVoiceTextToItems;`)(
    parseVoiceItems, voiceQuantityForProduct, { current: createVoiceProductMatcher([...products, ...pricedProducts, ...pulseProducts]) }, { current: new Map() }, false, normalizeVoiceName, { current: {} },
  );
  for (const spoken of ['पारले-जी बिस्किट', 'परले-ग बिस्किट दो पैकेट', 'परले-ग बिस्किट दो पैकेट']) {
    const item = processVoiceText(spoken).items[0];
    assert.equal(item.productId, 'parle');
    assert.equal(item.quantity, spoken.includes('दो') ? 2 : 1);
    assert.equal(item.price, 5);
    assert.equal(item.needsMatchReview, false);
  }
  const unknownItems = processVoiceText('zorbax soap two packets').items;
  assert.equal(unknownItems.length, 1);
  const unknown = unknownItems[0];
  assert.equal(unknown.productId, null);
  assert.equal(unknown.needsMatchReview, true);
  assert.equal(unknown.price, 0);
  for (const [spoken, id, price] of [
    ['चीनी पैंतालीस रुपये', 'sugar', 45], ['चीनी एक किलो', 'sugar', 45],
    ['कोलगेट तीस रुपए', 'small-colgate', 30], ['कोलगेट साठ रुपए', 'large-colgate', 60],
    ['कोलगेट तीस रुपए', 'small-colgate', 30],
  ] as const) {
    const result = processVoiceText(spoken).items;
    assert.equal(result.length, 1, spoken);
    assert.equal(result[0].productId, id, spoken);
    assert.equal(result[0].price, price);
    assert.equal(result[0].quantity, 1);
    assert.equal(result[0].needsMatchReview, false);
  }
  const silk = processVoiceText('डेरी मिल्क ₹55 तीन पैकेट').items;
  assert.equal(silk.length, 1);
  assert.equal(silk[0].productId, 'silk');
  assert.equal(silk[0].price, 55);
  assert.equal(silk[0].quantity, 3);
  assert.equal(silk[0].needsMatchReview, false);
  const chickpeas = processVoiceText('छोले एक किलो').items;
  assert.equal(chickpeas.length, 1);
  assert.equal(chickpeas[0].productId, 'kabuli');
  assert.equal(chickpeas[0].quantity, 1);
  assert.equal(chickpeas[0].unit, 'kg');
  assert.equal(chickpeas[0].needsMatchReview, false);
});

test('exact catalogue names never automatically switch to a different product', () => {
  const catalog: VoiceProduct[] = JSON.parse(readFileSync('krishna-products-catalog.json', 'utf8'));
  const real = createVoiceProductMatcher(catalog);
  const wrong: string[] = [];
  let resolved = 0;
  for (const product of catalog) {
    const result = real.match({ name: product.name });
    if (result.product) resolved++;
    if (result.product && result.product.id !== product.id) wrong.push(`${product.name} -> ${result.product.name}`);
  }
  assert.deepEqual(wrong, []);
  console.log(`Saved catalogue: ${catalog.length} exact names, ${resolved} resolved, ${catalog.length - resolved} require review, ${wrong.length} wrong automatic selections`);
});

test('a 5000-product catalogue keeps rare identity matches without a shortlist cutoff', () => {
  const many = Array.from({ length: 4999 }, (_, i) => ({ id: `other-${i}`, name: `Brand${i} Biscuit` }));
  const indexed = createVoiceProductMatcher([...many, products[0]]);
  const started = performance.now();
  const result = indexed.match({ name: 'परले-ग बिस्किट' });
  assert.equal(result.product?.id, 'parle');
  console.log(`5000-product matching: ${(performance.now() - started).toFixed(1)} ms on this machine`);
});
