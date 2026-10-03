import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createVoiceProductMatcher, normalizeVoiceName, voiceQuantityForProduct, totalQuantityPlan, type VoiceProduct } from './voice-product-matcher';
import { transpileModule, ScriptTarget } from 'typescript';
import { parseVoiceItems } from './voice-parser';
import { createProductSuggestions } from './product-suggestions';
import { productSaleForm } from './product-packaging';

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

test('future Hindi names produce selectable pronunciation alternatives without a product dictionary', () => {
  const catalog = [
    { id: 'a', name: 'FutureBrand A', localName: 'झुमणा', price: 40 },
    { id: 'b', name: 'FutureBrand B', localName: 'झूमना', price: 40 },
    { id: 'wrong', name: 'Unrelated', localName: 'नमक', price: 40 },
  ];
  for (const products of [catalog, [...catalog].reverse()]) {
    const engine = createVoiceProductMatcher(products);
    for (const extra of [{}, { saleForm: 'packet' as const }, { requestedPrice: 40 }]) {
      const result = engine.match({ name: 'झुमना', ...extra }, 'a');
      assert.equal(result.product, null);
      assert.equal(result.confidence, 'low');
      assert.deepEqual(result.candidates.map(c => c.product.id), ['a', 'b']);
    }
    assert.deepEqual(createProductSuggestions(products).suggest({ name: 'झुमना' }).brandVariants.map(p => p.id), ['a', 'b']);
    assert.equal(engine.match({ name: 'झुमणा' }).product?.id, 'a');
    assert.deepEqual(engine.match({ name: 'झुमना', requestedPrice: 90 }).candidates, []);
    assert.deepEqual(engine.match({ name: 'अनजान झुमना' }).candidates, []);
  }
  for (const [spoken, name] of [['धपला', 'दपला'], ['सिराना', 'शिराना'], ['बिरुणा', 'विरुणा'], ['झु मणा', 'झुमणा']]) {
    const result = createVoiceProductMatcher([{ id: 'new', name }]).match({ name: spoken });
    assert.equal(result.product, null, spoken);
    assert.deepEqual(result.candidates.map(c => c.product.id), ['new'], spoken);
  }
});

test('screenshot: seb recovers sev only when apple is not a catalogue identity', () => {
  const sev = { id: 'sev', name: 'Sev 200g', localName: 'सेव', baseUnit: 'pkt', price: 40 };
  const apple = { id: 'apple', name: 'Apple', baseUnit: 'kg', price: 100 };
  const engine = createVoiceProductMatcher([sev]);
  for (const extra of [{}, { saleForm: 'packet' as const }, { requestedPrice: 40 }, { quantity: 200, unit: 'g' }]) {
    assert.equal(engine.match({ name: 'सेब', ...extra }, 'sev').product, null);
  }
  for (const spoken of ['सेब', 'सेव द पैकेट', 'सेब द पैकेट', 'द पैकेट सेव', 'सेव दो पैकेट']) {
    const parsed = parseVoiceItems(spoken);
    assert.equal(parsed.length, 1, spoken);
    const result = engine.match(parsed[0]);
    assert.equal(result.product?.id, spoken.includes('सेब') ? undefined : 'sev', spoken);
    assert.equal(parsed[0].quantity, spoken === 'सेब' ? 1 : 2, spoken);
    const billed = voiceQuantityForProduct(parsed[0].quantity, parsed[0].unit, sev, result.packetCount);
    assert.equal(billed.quantity, spoken === 'सेब' ? 1 : 2, spoken);
    assert.equal(billed.unit, 'pkt', spoken);
    assert.deepEqual(createProductSuggestions([sev]).suggest({ name: parsed[0].name, sourceRawText: parsed[0].rawText,
      parsedQty: parsed[0].quantity, parsedUnit: parsed[0].unit }).brandVariants.map(p => p.id), ['sev']);
  }
  for (const catalog of [[sev, apple], [apple, sev]]) {
    const both = createVoiceProductMatcher(catalog);
    assert.equal(both.match({ name: 'सेब' }).product?.id, 'apple');
    assert.equal(both.match({ name: 'सेव' }).product?.id, 'sev');
    assert.equal(both.match({ name: 'सेब', saleForm: 'packet' }, 'sev').product, null);
    assert.equal(both.match({ name: 'सेब', requestedPrice: 40 }, 'sev').product, null);
  }
  const brands = [{ ...sev, id: 'a', name: 'Acme Sev', localName: 'एक्मी सेव' },
    { ...sev, id: 'b', name: 'Other Sev', localName: 'अन्य सेव' }];
  assert.equal(createVoiceProductMatcher(brands).match({ name: 'सेब', saleForm: 'packet' }, 'a').product, null);
  assert.deepEqual(createProductSuggestions(brands).suggest({ name: 'सेब' }).brandVariants.map(p => p.id), ['a', 'b']);
});

test('clipped do is a quantity only directly before a unit and stays on its own item', () => {
  for (const spoken of ['सेव द पैकेट', 'द पैकेट सेव', 'सेव द packet', 'सेव द किलो']) {
    const [item] = parseVoiceItems(spoken);
    assert.equal(item.quantity, 2, spoken);
    assert.equal(item.name, 'सेव', spoken);
    assert.ok(item.rawText.includes('द'), spoken);
  }
  for (const spoken of ['द', 'द सेव', 'सेव द', 'दाबर तेल', 'द रुपये सेव']) {
    const items = parseVoiceItems(spoken);
    assert.ok(items.every(item => item.quantity === 1), spoken);
    assert.ok(items.some(item => item.name.includes('द')), spoken);
  }
  const items = parseVoiceItems('सेव द पैकेट और नमकीन तीन पैकेट');
  assert.deepEqual(items.map(item => [item.name, item.quantity]), [['सेव', 2], ['नमकीन', 3]]);
  const [sized] = parseVoiceItems('सेव 200 ग्राम वाला द पैकेट');
  assert.deepEqual(sized.packSize, { quantity: 200, unit: 'g' });
  assert.equal(sized.packetCount, 2);
  const [priced] = parseVoiceItems('सेव 40 रुपये द पैकेट');
  assert.equal(priced.requestedPrice, 40);
  assert.equal(priced.quantity, 2);
});

test('catalogue-backed Hindi recovery handles consonants and speech-inserted spaces', () => {
  const catalog = [
    { id: 'ghee', name: 'Ghee', baseUnit: 'kg', price: 500 },
    { id: 'jeeravan', name: 'Jeeravan 100g', baseUnit: 'pc', price: 40 },
    { id: 'jeera', name: 'Jeera 100g', localName: 'जीरा', price: 35 },
    { id: 'fig', name: 'Anjeer', localName: 'अंजीर', price: 200 },
  ];
  const engine = createVoiceProductMatcher(catalog);
  for (const spoken of ['गी 1 किलो', 'घी 1 किलो', 'जीरावण 2 पैकेट', 'जी रावण 2 पैकेट', 'जीरावन 2 पैकेट']) {
    const parsed = parseVoiceItems(spoken);
    assert.equal(parsed.length, 1, spoken);
    const result = engine.match(parsed[0]);
    const expected = spoken.includes('किलो') ? 'ghee' : 'jeeravan';
    const exact = spoken.startsWith('घी') || spoken.startsWith('जीरावन');
    assert.equal(result.product?.id, exact ? expected : undefined, spoken);
    const choices = createProductSuggestions(catalog).suggest({ name: parsed[0].name,
      sourceRawText: parsed[0].rawText, parsedQty: parsed[0].quantity, parsedUnit: parsed[0].unit });
    assert.deepEqual(choices.brandVariants.map(p => p.id), [expected], spoken);
  }
  assert.equal(engine.match({ name: 'जीरा' }).product?.id, 'jeera');
  assert.equal(engine.match({ name: 'अंजीर' }).product?.id, 'fig');
  assert.equal(createVoiceProductMatcher(catalog.slice(2)).match({ name: 'जी रावण' }).product, null);
});

test('Hindi sound recovery is general, bounded and preserves exact identities', () => {
  for (const [spoken, stored] of [['धनिया', 'दनिया'], ['साबुन', 'साबुण'], ['हल्दी', 'हल्धी'], ['काजू', 'खाजू']]) {
    const engine = createVoiceProductMatcher([{ id: 'local', name: stored }]);
    assert.equal(engine.match({ name: spoken }).product, null);
    assert.deepEqual(engine.match({ name: spoken }).candidates.map(c => c.product.id), ['local'], `${spoken} -> ${stored}`);
  }
  const engine = createVoiceProductMatcher([
    { id: 'gi', name: 'गी' }, { id: 'ghee', name: 'घी' },
    { id: 'n', name: 'जीरावन' }, { id: 'retroflex', name: 'जीरावण' },
  ]);
  for (const [name, id] of [['गी', 'gi'], ['घी', 'ghee'], ['जीरावन', 'n'], ['जीरावण', 'retroflex']]) {
    assert.equal(engine.match({ name }).product?.id, id);
  }
  // A split pronunciation compatible with two distinct catalogue identities is not a correction.
  assert.equal(engine.match({ name: 'जी रावण', saleForm: 'packet', requestedPrice: 10 }, 'n').product, null);
  assert.equal(createVoiceProductMatcher([{ id: 'ghee', name: 'Ghee' }]).match({ name: 'ग' }).product, null);
});

test('recovered generic names still require a brand choice, even with price, pack or saved preference', () => {
  const catalog = [{ id: 'amul', name: 'Amul Ghee 1kg', price: 500 }, { id: 'other', name: 'Other Ghee 1kg', price: 500 }];
  const engine = createVoiceProductMatcher(catalog);
  for (const extra of [{}, { saleForm: 'packet' as const }, { requestedPrice: 500 }, { quantity: 1, unit: 'kg' }]) {
    const result = engine.match({ name: 'गी', ...extra }, 'amul');
    assert.equal(result.product, null);
    assert.equal(result.candidates.filter(c => c.eligible).length, 2);
  }
  assert.equal(engine.match({ name: 'अमूल गी', quantity: 1, unit: 'kg' }).product, null);
  assert.deepEqual(engine.match({ name: 'अमूल गी', quantity: 1, unit: 'kg' }).candidates.map(c => c.product.id), ['amul']);
  assert.equal(engine.match({ name: 'अनजान गी', requestedPrice: 500 }).product, null);
  assert.equal(engine.match({ name: 'अमूल गी', requestedPrice: 1 }).product, null);
  assert.equal(engine.match({ name: 'अमूल गी', quantity: 1, unit: 'l' }).product, null);
});

test('relative Hindi and Hinglish packs select and suggest by size, preserving packet counts', () => {
  const catalog = [
    { id: 'large', name: 'Acme Tea 1kg', price: 90 },
    { id: 'small', name: 'Acme Tea 100g', price: 100 },
    { id: 'middle', name: 'Acme Tea 500g', price: 80 },
    { id: 'other', name: 'Other Tea 50g', price: 5 },
    { id: 'loose', name: 'Acme Tea Loose', baseUnit: 'kg', price: 40 },
  ];
  for (const phrase of ['chhota pack', 'chota size', 'chhota wala', 'chhota packet', 'छोटा पैकेट', 'छोटी साइज',
    'bada size', 'bada wala', 'bada packet', 'bada pack', 'बड़ा पैकेट', 'बड़ा वाला', 'medium size', 'midium size', 'मीडियम पैकेट']) {
    const expected = /^(b|ब)/u.test(phrase) ? ['large', 'middle', 'small']
      : /^(m|म)/u.test(phrase) ? ['middle', 'small', 'large'] : ['small', 'middle', 'large'];
    for (const spoken of [`Acme Tea ${phrase}`, `2 ${phrase} Acme Tea`]) {
      const requests = parseVoiceItems(spoken);
      assert.equal(requests.length, 1, spoken);
      const request = requests[0];
      const result = createVoiceProductMatcher(catalog).match(request, 'large');
      assert.equal(result.product?.id, expected[0], spoken);
      assert.equal(result.packetCount, spoken.startsWith('2') ? 2 : 1, spoken);
      assert.deepEqual(result.candidates.filter(c => c.eligible).map(c => c.product.id), expected, spoken);
      const suggestions = createProductSuggestions(catalog).suggest({ productId: result.product?.id,
        spokenWord: request.name, sourceRawText: request.rawText, parsedQty: request.quantity, parsedUnit: request.unit });
      assert.deepEqual(suggestions.sizeVariants.map(p => p.id), expected.slice(1), spoken);
    }
  }
});

test('relative sizes fall back to prices and medium uses the lower distinct middle size', () => {
  const catalog = [10, 20, 30, 40].map(price => ({ id: String(price), name: 'Acme Soap', price }));
  for (const [size, expected] of [['chota', '10'], ['bada', '40'], ['midium', '20']]) {
    assert.equal(createVoiceProductMatcher(catalog).match({ name: `Acme Soap ${size} wala` }).product?.id, expected);
  }
  const measured = [100, 100, 200, 300, 400].map((weight, i) => ({ id: String(i), name: `Acme Tea ${weight}g` }));
  assert.equal(createVoiceProductMatcher(measured).match({ name: 'Acme Tea medium size' }).product?.id, '2');
  assert.equal(createVoiceProductMatcher(measured).match({ name: 'Acme Tea bada pack', packSize: { quantity: 100, unit: 'g' } }).product?.id, '0');
});

const basmatiProducts = [
  { id: 'rice-5', name: 'Basmati Chawal 5kg', localName: 'बासमती चावल 5 किलो', baseUnit: 'pkt', price: 460 },
  { id: 'rice-half', name: 'Basmati Chawal 500g', baseUnit: 'pkt', price: 50 },
  { id: 'rice-1', name: 'Basmati Chawal 1kg', localName: 'बासमती चावल 1 किलो', baseUnit: 'pkt', price: 95 },
  { id: 'ordinary', name: 'Chawal Khula', localName: 'चावल खुला', baseUnit: 'kg', price: 80 },
];

test('total weight ranks exact packs, loose, exact smaller combinations and oversized packs', () => {
  const exact = { id: 'rice-2', name: 'Basmati Chawal 2kg', baseUnit: 'pkt', price: 185 };
  const loose = { id: 'rice-loose', name: 'Basmati Chawal Khula', baseUnit: 'kg', price: 90 };
  const request = parseVoiceItems('बासमती चावल 2 किलो')[0];
  for (const catalog of [[...basmatiProducts, loose, exact], [exact, loose, ...basmatiProducts].reverse()]) {
    const engine = createVoiceProductMatcher(catalog);
    assert.equal(engine.match(request, 'rice-5').product?.id, 'rice-2');
    assert.deepEqual(createProductSuggestions(catalog).suggest({ name: request.name, parsedQty: 2, parsedUnit: 'kg' }).brandVariants.map(p => p.id),
      ['rice-2', 'rice-loose', 'rice-1', 'rice-half', 'rice-5']);
    assert.equal(createVoiceProductMatcher(catalog.filter(p => p.id !== 'rice-2')).match(request).product?.id, 'rice-loose');
  }
});

test('total weight selects whole smaller packets and keeps ranked alternatives after selection', () => {
  const engine = createVoiceProductMatcher(basmatiProducts);
  for (const spoken of ['basmati chawal 2 kilo', 'बासमती चावल दो किलो']) {
    const request = parseVoiceItems(spoken)[0];
    const result = engine.match(request);
    assert.equal(result.product?.id, 'rice-1', spoken);
    assert.equal(result.packetCount, 2);
    assert.deepEqual(voiceQuantityForProduct(request.quantity, request.unit, result.product!, result.packetCount), { quantity: 2, unit: 'pkt' });
    assert.equal(totalQuantityPlan(2, 'kg', result.product!)?.label, '2 × 1 kg = 2 kg');
    assert.deepEqual(createProductSuggestions(basmatiProducts).suggest({ productId: 'rice-1', spokenWord: request.name, parsedQty: 2, parsedUnit: 'kg', packetCount: 2 }).brandVariants.map(p => p.id), ['rice-half', 'rice-5']);
    const half = totalQuantityPlan(2, 'kg', basmatiProducts[1])!;
    assert.equal(half.count, 4);
    assert.deepEqual(voiceQuantityForProduct(2, 'kg', basmatiProducts[1], half.count), { quantity: 4, unit: 'pkt' });
  }
});

test('total quantities never auto-round, split sealed packets, cross dimensions or lose identity', () => {
  const engine = createVoiceProductMatcher(basmatiProducts.filter(p => p.id !== 'rice-half'));
  for (const request of [
    { name: 'basmati chawal', quantity: 1.5, unit: 'kg' },
    { name: 'basmati chawal', quantity: 2, unit: 'l' },
    { name: 'unknown basmati chawal', quantity: 2, unit: 'kg' },
  ]) assert.equal(engine.match(request).product, null);
  assert.match(engine.match({ name: 'basmati chawal', quantity: 1.5, unit: 'kg' }).reason, /Product recognized/);
  const result = createVoiceProductMatcher([{ id: 'oil', name: 'Acme Oil 500ml', baseUnit: 'pkt' }]).match({ name: 'acme oil', quantity: 2, unit: 'l' });
  assert.equal(result.packetCount, 4);
  const explicit = createVoiceProductMatcher(basmatiProducts).match(parseVoiceItems('basmati chawal 2 kilo wala 1 packet')[0]);
  assert.equal(explicit.packetCount, 1); // Explicit individual size is not a total-weight request.
});

test('exact catalogue tokens exclude phonetic neighbours before saved-choice and price selection', () => {
  const catalog = [
    { id: 'cream', name: 'Cream', price: 10 },
    { id: 'churma', name: 'Churma', price: 20 },
    { id: 'tea', name: 'Tea', price: 10 },
    { id: 'tata', name: 'Tata', price: 20 },
    { id: 'mala', name: 'Mala', price: 10 },
    { id: 'mela', name: 'Mela', price: 20 },
  ];
  const engine = createVoiceProductMatcher(catalog);
  for (const product of catalog) {
    const other = catalog.find(p => p.id !== product.id)!;
    assert.deepEqual(engine.match({ name: product.name }, other.id).candidates.filter(c => c.eligible).map(c => c.product.id), [product.id]);
  }
  assert.equal(engine.match({ name: 'Mala', requestedPrice: 20 }, 'mela').product, null);
});

test('unmapped Hindi nasal marks are not discarded into a different product identity', () => {
  const engine = createVoiceProductMatcher([{ id: 'jeera', name: 'Jeera', localName: 'जीरा' }]);
  // This spelling intentionally has no dictionary entry: exercise the general
  // Unicode safeguard rather than only the known anjeer transliteration.
  assert.equal(engine.match({ name: 'अँजीर' }, 'jeera').product, null);
  assert.ok(engine.match({ name: 'अँजीर' }).candidates.every(c => !c.eligible));
});

test('unknown Latin spellings still recover likely typos', () => {
  assert.equal(createVoiceProductMatcher([{ id: 'dettol', name: 'Dettol Soap' }]).match({ name: 'dettoll soap' }).product?.id, 'dettol');
});

const packagedProducts = [
  { id: 'poha-loose', name: 'Poha Khula', localName: 'पोहा खुला', price: 40, baseUnit: 'kg', baseQuantity: 1 },
  { id: 'poha-500', name: 'Poha 500g', localName: 'पोहा', price: 38, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 500, packetUnit: 'g' },
  { id: 'poha-1000', name: 'Poha 1kg', localName: 'पोहा', price: 70, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 1, packetUnit: 'kg' },
  { id: 'atta-loose', name: 'Aata Khula', localName: 'आटा खुला', price: 28, baseUnit: 'kg', baseQuantity: 1 },
  { id: 'atta-1', name: 'Aata 1kg', localName: 'आटा 1 किलो', price: 45, baseUnit: 'pkt', baseQuantity: 1000, packetWeight: 1000, packetUnit: 'g' },
  { id: 'atta-2', name: 'Aata 2kg', localName: 'आटा 2 किलो', price: 85, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 2, packetUnit: 'kg' },
  { id: 'atta-5', name: 'Aata 5kg', localName: 'आटा 5 किलो', price: 200, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 5, packetUnit: 'kg' },
  { id: 'atta-10', name: 'Aata 10kg', localName: 'आटा 10 किलो', price: 390, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 10, packetUnit: 'kg' },
];

test('loose and packet requests match and suggest only their requested sale form', () => {
  const engine = createVoiceProductMatcher(packagedProducts);
  const suggestions = createProductSuggestions(packagedProducts);
  for (const [spoken, form] of [
    ['poha khula', 'loose'], ['पोहा खुला', 'loose'], ['पोहा एक किलो खुला', 'loose'],
    ['poha packet', 'packet'], ['पोहा पैकेट', 'packet'], ['पोहा एक किलो पैकेट', 'packet'],
  ] as const) {
    const parsed = parseVoiceItems(spoken);
    assert.equal(parsed.length, 1, spoken);
    const result = engine.match(parsed[0]);
    assert.ok(result.product, spoken);
    assert.equal(productSaleForm(result.product), form, spoken);
    assert.ok(result.candidates.every(c => productSaleForm(c.product) === form), spoken);
    const choices = suggestions.suggest({ name: parsed[0].name, sourceRawText: parsed[0].rawText,
      parsedQty: parsed[0].quantity, parsedUnit: parsed[0].unit, packSize: parsed[0].packSize });
    assert.ok(choices.brandVariants.length, spoken);
    assert.ok(choices.brandVariants.every(p => productSaleForm(p) === form), spoken);
  }
});

test('packet size and packet count remain separate in Hindi, Hinglish, and either word order', () => {
  const engine = createVoiceProductMatcher(packagedProducts);
  for (const spoken of [
    'aata ek kilo wala 5 packet', 'आटा एक किलो वाला पाँच पैकेट', 'आटा 1kg वाला 5 पैकेट',
    'आटा 5 पैकेट एक किलो वाले', '5 पैकेट आटा एक किलो वाला', '1 किलो आटा 5 पैकेट',
    'आटा एक किलो 5 पैकेट', 'aata 5 packets 1kg',
  ]) {
    const parsed = parseVoiceItems(spoken);
    assert.equal(parsed.length, 1, spoken);
    assert.deepEqual(parsed[0].packSize, { quantity: 1, unit: 'kg' }, spoken);
    assert.equal(parsed[0].packetCount, 5, spoken);
    const result = engine.match(parsed[0]);
    assert.equal(result.product?.id, 'atta-1', spoken);
    assert.deepEqual(voiceQuantityForProduct(parsed[0].quantity, parsed[0].unit, result.product!, result.packetCount), { quantity: 5, unit: 'pkt' }, spoken);
  }
});

test('exact and nearest packet sizes select whole packs, with the actual size reported', () => {
  const engine = createVoiceProductMatcher(packagedProducts);
  for (const spoken of ['aata packet 5 kg', 'आटा पैकेट पांच किलो', 'आटा 5 किलो वाला']) {
    const request = parseVoiceItems(spoken)[0];
    const result = engine.match(request, 'atta-1');
    assert.equal(result.product?.id, 'atta-5', spoken);
    assert.equal(result.packetCount, 1);
    assert.equal(result.isApproximateSize, false);
  }
  const available = createVoiceProductMatcher(packagedProducts.filter(p => p.id !== 'atta-5' && p.id !== 'atta-10'));
  const request = parseVoiceItems('आटा पैकेट 5 किलो')[0];
  const result = available.match(request);
  assert.equal(result.product?.id, 'atta-2');
  assert.equal(result.isApproximateSize, true);
  assert.equal(result.selectedPackLabel, '2 kg');
  assert.deepEqual(voiceQuantityForProduct(request.quantity, request.unit, result.product!, result.packetCount), { quantity: 1, unit: 'pkt' });
  assert.equal(engine.match(parseVoiceItems('unknownbrand आटा पैकेट 5 किलो')[0]).product, null);
  assert.equal(engine.match(parseVoiceItems('आटा पैकेट 5 लीटर')[0]).product, null);
});

test('pack count converts correctly for packets stored in weight-based catalogue units', () => {
  const weighed = { id: 'weighed', name: 'Acme Atta 1kg', baseUnit: 'g', baseQuantity: 1000, packetWeight: 1, packetUnit: 'kg' };
  assert.deepEqual(voiceQuantityForProduct(5, 'pc', weighed, 5), { quantity: 5000, unit: 'g' });
  assert.deepEqual(voiceQuantityForProduct(5, 'pc', weighed), { quantity: 5000, unit: 'g' });
  assert.deepEqual(voiceQuantityForProduct(5, 'kg', weighed, 1), { quantity: 1000, unit: 'g' });
});

test('packet sizes and counts do not spill into the next product or replace the price', () => {
  const parsed = parseVoiceItems('आटा एक किलो वाला 5 पैकेट 45 रुपये और पोहा खुला दो किलो');
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].packetCount, 5);
  assert.equal(parsed[0].requestedPrice, 45);
  assert.deepEqual(parsed[0].packSize, { quantity: 1, unit: 'kg' });
  assert.equal(parsed[1].quantity, 2);
  assert.equal(parsed[1].unit, 'kg');
  assert.equal(parsed[1].packSize, undefined);
  const result = createVoiceProductMatcher(packagedProducts).match(parsed[0]);
  assert.equal(result.product?.id, 'atta-1');
});

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
  const total = sizes.match({ name: 'acme tea', unit: 'g', quantity: 200 });
  assert.equal(total.product?.id, 'small');
  assert.equal(total.packetCount, 2);
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
    parseVoiceItems, voiceQuantityForProduct, { current: createVoiceProductMatcher([...products, ...pricedProducts, ...pulseProducts, ...packagedProducts, ...basmatiProducts]) }, { current: new Map() }, false, normalizeVoiceName, { current: {} },
  );
  const totalStart = source.indexOf('  const calculateItemTotal =');
  const totalEnd = source.indexOf('  const handlePriceUpdate =', totalStart);
  const totalJavascript = transpileModule(source.slice(totalStart, totalEnd), { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText;
  const calculateTotal = new Function('shop', `${totalJavascript}; return calculateItemTotal;`)(null);
  const rice = processVoiceText('बासमती चावल 2 किलो').items[0];
  assert.equal(rice.productId, 'rice-1');
  assert.equal(rice.quantity, 2);
  assert.equal(rice.unit, 'pkt');
  assert.equal(rice.packetCount, 2);
  assert.equal(calculateTotal(rice), 190);
  const overridesStart = source.indexOf('const buildOverrides = (sug: any) =>');
  const overridesEnd = source.indexOf('// Helper: pin a product', overridesStart);
  const overridesJs = transpileModule(source.slice(overridesStart, overridesEnd), { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText;
  const choose = new Function('item', 'recalculateQtyAndUnit', 'totalQuantityPlan', `${overridesJs}; return buildOverrides;`)(rice, voiceQuantityForProduct, totalQuantityPlan);
  const halfRice = { ...rice, ...choose(basmatiProducts[1]) };
  assert.equal(halfRice.packetCount, 4);
  assert.equal(halfRice.quantity, 4);
  assert.equal(calculateTotal(halfRice), 200);
  const largerRice = { ...rice, ...choose(basmatiProducts[0]) };
  assert.equal(largerRice.quantity, 1); // Explicitly chosen alternative, never 0.4 sealed packets.
  assert.equal(largerRice.isApproximateSize, true);
  assert.equal(calculateTotal(largerRice), 460);
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
  for (const [spoken, id, quantity, unit] of [
    ['poha khula', 'poha-loose', 1, 'kg'],
    ['aata packet 5 kg', 'atta-5', 1, 'pkt'],
    ['aata ek kilo wala 5 packet', 'atta-1', 5, 'pkt'],
    ['aata ek kilo wala 2 packet', 'atta-1', 2, 'pkt'],
    ['aata packet 7 kg', 'atta-5', 1, 'pkt'],
  ] as const) {
    const items = processVoiceText(spoken).items;
    assert.equal(items.length, 1, spoken);
    assert.equal(items[0].productId, id, spoken);
    assert.equal(items[0].quantity, quantity, spoken);
    assert.equal(items[0].unit, unit, spoken);
    assert.equal(items[0].needsMatchReview, false, spoken);
    assert.equal(items[0].isApproximateSize, spoken === 'aata packet 7 kg', spoken);
    assert.equal(calculateTotal(items[0]), items[0].price * quantity, spoken);
  }
  for (let repeat = 0; repeat < 2; repeat++) {
    const items = processVoiceText('आटा एक किलो वाला 5 पैकेट और आटा एक किलो वाला 2 पैकेट').items;
    assert.equal(items.length, 1);
    assert.equal(items[0].quantity, 7);
    assert.equal(items[0].packetCount, 7);
    assert.equal(calculateTotal(items[0]), 315);
  }
  assert.equal(calculateTotal({ ...packagedProducts[4], baseUnit: 'g', baseQuantity: 1000, quantity: 5000, unit: 'g' }), 225);
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
