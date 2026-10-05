import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { transpileModule, ScriptTarget } from 'typescript';
import { parseVoiceItems } from './voice-parser';
import { createVoiceProductMatcher, normalizeVoiceName, voiceQuantityForProduct } from './voice-product-matcher';
import { canCorrectProductByVoice } from './voice-review';

// Exercise the actual page handlers with browser recognition events under our control.
const source = readFileSync('src/app/billing/page.tsx', 'utf8');
const compile = (start: string, end: string) => transpileModule(
  source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start))),
  { compilerOptions: { target: ScriptTarget.ES2022 } },
).outputText;

function setup() {
  let now = 0;
  let nextTimer = 0;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const advance = (ms: number) => {
    now += ms;
    for (const [id, timer] of timers) {
      if (timer.at <= now) { timers.delete(id); timer.callback(); }
    }
  };
  const unchanged = { name: 'Existing', productId: 'existing', quantity: 1 };
  const original = { name: 'wrong name', productId: null, quantity: 3, unit: 'pc', parsedQty: 3, parsedUnit: 'pc', hasExplicitQty: true };
  const scope: any = {
    releaseTimerRef: { current: null },
    setTimeout: (callback: () => void, ms: number) => {
      const id = ++nextTimer;
      timers.set(id, { at: now + ms, callback });
      return id;
    },
    clearTimeout: (id: number) => timers.delete(id),
    reviewItems: [unchanged, original],
    recognitionRef: { current: null }, isListeningRef: { current: false },
    voiceEngine: { engine: 'browser' },
    heldInputRef: { current: null }, baseReviewItemsRef: { current: [] },
    itemOverridesRef: { current: {} }, globalTranscriptRef: { current: '' },
    currentBreathRef: { current: '' }, matchCacheRef: { current: new Map() },
    voiceMatcherRef: { current: createVoiceProductMatcher([{ id: 'lux', name: 'Lux Soap', price: 20, baseUnit: 'pc' }]) },
    _isDebug: false, parseVoiceItems, voiceQuantityForProduct, canCorrectProductByVoice, normalizeVoiceName,
    shop: null, openSuggestionIdxRef: { current: null },
    getSuggestions: () => ({ brandVariants: [], sizeVariants: [] }),
    useEffect: (effect: () => () => void) => { scope.cleanup = effect(); },
  };
  for (const name of ['setCorrectingItemIdx', 'setVoiceMessage', 'setFinalTranscript', 'setSelectedBrandPerItem', 'setOpenSuggestionIdx', 'setIsListening', 'setMode', 'setIsReviewing', 'setPerfStats']) {
    scope[name] = (value: any) => { scope[name + 'Value'] = value; };
  }
  scope.setReviewItems = (update: any) => { scope.reviewItems = typeof update === 'function' ? update(scope.reviewItems) : update; };
  const listeners: Record<string, (event?: any) => void> = {};
  const surface = { addEventListener: (name: string, fn: any) => { listeners[name] = fn; }, removeEventListener: () => {} };
  class Recognition {
    starts = 0; stops = 0; aborts = 0;
    start() { this.starts++; }
    stop() { this.stops++; }
    abort() { this.aborts++; }
  }
  scope.window = { ...surface, SpeechRecognition: Recognition };
  scope.document = { ...surface, hidden: false };
  // Use the production merger, including overlap detection, rather than a join stub.
  scope.mergeOverlappingStrings = new Function('scope', `with(scope) {
    ${compile('const getLevenshteinDistance =', 'export default function BillingPage()')}
    ${compile('  const areWordsSimilar =', '  const recalculateQtyAndUnit =')}
    return mergeOverlappingStrings;
  }`)(scope);
  scope.processVoiceTextToItems = new Function('scope', `with(scope) { ${compile('  const processVoiceTextToItems =', '  const getSuggestions =')} return processVoiceTextToItems; }`)(scope);
  const handlers = new Function('scope', `with(scope) { ${compile('  const startVoiceInput =', '  const router =')} return { holdToSpeak }; }`)(scope);
  const card = handlers.holdToSpeak(1);
  const main = handlers.holdToSpeak();
  const pointer = (id = 1, interactive = false) => ({
    isPrimary: true, button: 0, pointerId: id, preventDefault() {},
    currentTarget: { setPointerCapture() {} }, target: { closest: () => interactive },
  });
  const speak = (text: string) => scope.recognitionRef.current.onresult({ results: [{ 0: { transcript: text }, isFinal: true }] });
  return { scope, card, main, pointer, speak, listeners, unchanged, original, advance };
}

test('release stops the main microphone and a delayed permission grant cannot reopen it', () => {
  const h = setup();
  h.main.onPointerDown(h.pointer());
  const rec = h.scope.recognitionRef.current;
  assert.equal(rec.starts, 1);
  h.main.onPointerUp(h.pointer(2));
  assert.equal(rec.stops, 0);
  h.main.onPointerUp(h.pointer());
  h.main.onLostPointerCapture(h.pointer());
  h.listeners.pointerup(h.pointer());
  h.advance(499);
  assert.equal(rec.stops, 0);
  h.advance(1);
  assert.equal(rec.stops, 1);
  rec.onstart();
  assert.equal(rec.aborts, 1);
  rec.onend();
  assert.equal(rec.starts, 1);
  assert.equal(h.scope.recognitionRef.current, null);
});

test('card correction waits for release, replaces only that item, and preserves quantity', () => {
  const h = setup();
  h.card.onPointerDown(h.pointer());
  h.speak('lux soap');
  assert.equal(h.scope.reviewItems[1], h.original);
  const rec = h.scope.recognitionRef.current;
  h.card.onPointerUp(h.pointer());
  h.advance(250);
  h.speak('lux soap');
  assert.equal(rec.stops, 0);
  h.advance(250);
  assert.equal(rec.stops, 1);
  // Browsers may deliver the final transcript after stop().
  h.speak('lux soap');
  rec.onend();
  assert.equal(h.scope.reviewItems.length, 2);
  assert.equal(h.scope.reviewItems[0], h.unchanged);
  assert.equal(h.scope.reviewItems[1].productId, 'lux');
  assert.equal(h.scope.reviewItems[1].quantity, 3);
});

test('correction honors spoken quantity; silence and multiple products leave the card intact', () => {
  for (const phrase of ['2 lux soap', '', 'lux soap and mystery widget']) {
    const h = setup();
    h.card.onPointerDown(h.pointer());
    if (phrase) h.speak(phrase);
    const rec = h.scope.recognitionRef.current;
    h.card.onPointerUp(h.pointer());
    h.advance(500);
    rec.onend();
    if (phrase.startsWith('2')) assert.equal(h.scope.reviewItems[1].quantity, 2);
    else assert.equal(h.scope.reviewItems[1], h.original);
  }
});

test('cancellation, capture loss, backgrounding and unmount stop recognition without restart', () => {
  for (const action of ['onPointerCancel', 'onLostPointerCapture', 'blur', 'visibilitychange', 'cleanup']) {
    const h = setup();
    h.card.onPointerDown(h.pointer());
    const rec = h.scope.recognitionRef.current;
    if (action in h.card) h.card[action](h.pointer());
    else if (action === 'cleanup') h.scope.cleanup();
    else { h.scope.document.hidden = true; h.listeners[action](); }
    assert.equal(rec.stops + rec.aborts, 1, action);
    rec.onend();
    assert.equal(rec.starts, 1, action);
  }
});

test('controls inside the card do not open the mic; keyboard hold stops on key release', () => {
  const h = setup();
  h.card.onPointerDown(h.pointer(1, true));
  assert.equal(h.scope.recognitionRef.current, null);
  const element = {};
  const key = { key: ' ', target: element, currentTarget: element, preventDefault() {}, repeat: false };
  h.main.onKeyDown(key);
  const rec = h.scope.recognitionRef.current;
  h.main.onKeyDown({ ...key, repeat: true });
  assert.equal(rec.starts, 1);
  h.main.onKeyUp(key);
  assert.equal(rec.stops, 0);
  h.advance(500);
  assert.equal(rec.stops, 1);
});

test('backgrounding and unmount cancel a pending delayed stop', () => {
  for (const action of ['blur', 'cleanup']) {
    const h = setup();
    h.card.onPointerDown(h.pointer());
    const rec = h.scope.recognitionRef.current;
    h.card.onPointerUp(h.pointer());
    if (action === 'cleanup') h.scope.cleanup();
    else h.listeners.blur();
    assert.equal(rec.stops + rec.aborts, 1);
    h.advance(500);
    assert.equal(rec.stops + rec.aborts, 1);
  }
});

test('recognition may restart within the release grace period but never after it', () => {
  const h = setup();
  h.main.onPointerDown(h.pointer());
  const rec = h.scope.recognitionRef.current;
  h.main.onPointerUp(h.pointer());
  h.advance(250);
  rec.onend();
  assert.equal(rec.starts, 2);
  h.advance(250);
  assert.equal(rec.stops, 1);
  rec.onend();
  assert.equal(rec.starts, 2);
});

test('recognized names awaiting brand or size choices never activate card correction', () => {
  const matcher = createVoiceProductMatcher([
    { id: 'lux', name: 'Lux Soap', baseUnit: 'pc', packetWeight: 100, packetUnit: 'g' },
    { id: 'nirma', name: 'Nirma Soap', baseUnit: 'pc', packetWeight: 100, packetUnit: 'g' },
  ]);
  for (const request of [{ name: 'soap' }, { name: 'lux soap', quantity: 150, unit: 'g' }]) {
    const decision = matcher.match(request);
    assert.equal(decision.product, null);
    const item = { productId: null, confidence: decision.confidence, matchReason: decision.reason, matchCandidateDetails: decision.candidates };
    assert.equal(canCorrectProductByVoice(item), false);
    const h = setup();
    h.scope.reviewItems[1] = item;
    h.card.onPointerDown(h.pointer());
    assert.equal(h.scope.recognitionRef.current, null);
    const element = {};
    h.card.onKeyDown({ key: ' ', target: element, currentTarget: element, preventDefault() {}, repeat: false });
    assert.equal(h.scope.recognitionRef.current, null);
  }
});

test('voice correction is available for missing or low-confidence identity, not a confident selection', () => {
  assert.equal(canCorrectProductByVoice({ productId: 'lux', confidence: 'high' }), false);
  assert.equal(canCorrectProductByVoice({ productId: 'lux', confidence: 'low' }), true);
  assert.equal(canCorrectProductByVoice({ productId: null, confidence: 'low', matchCandidateDetails: [] }), true);
  assert.equal(canCorrectProductByVoice({ productId: null, matchReason: 'Choose the brand or pack size' }), false);
});

function orderSetup() {
  const h = setup();
  h.scope.reviewItems = [];
  h.scope.voiceMatcherRef.current = createVoiceProductMatcher([
    { id: 'gud', name: 'Jaggery', localName: 'गुड़', baseUnit: 'kg' },
    { id: 'salt', name: 'Salt', localName: 'नमक', baseUnit: 'pc' },
    { id: 'rice', name: 'Rice', localName: 'चावल', baseUnit: 'kg' },
    { id: 'tea', name: 'Tea', localName: 'चाय पत्ती', baseUnit: 'kg' },
    { id: 'dal', name: 'Toor Dal', localName: 'तुवर दाल', baseUnit: 'kg' },
    { id: 'chana', name: 'Kabuli Chana Khula', localName: 'काबुली चना खुला', baseUnit: 'kg' },
  ]);
  h.main.onPointerDown(h.pointer());
  const emit = (texts: string[], isFinal = true) => h.scope.recognitionRef.current.onresult({
    resultIndex: 0,
    results: texts.map(transcript => ({ 0: { transcript }, isFinal })),
  });
  return { ...h, emit };
}

test('Hindi product and quantity fragments stay together without losing decimal weights', () => {
  for (const [name, quantityText, id, quantity, unit] of [
    ['गुड़', 'आधा किलो', 'gud', 0.5, 'kg'],
    ['गुड़', 'ढाई किलो', 'gud', 2.5, 'kg'],
    ['गुड़', '2.5 किलो', 'gud', 2.5, 'kg'],
    ['नमक', 'तीन पैकेट', 'salt', 3, 'pc'],
  ] as const) {
    const h = orderSetup();
    h.emit(['', name], false);
    h.emit(['', name, quantityText]);
    assert.equal(h.scope.reviewItems.length, 1);
    assert.equal(h.scope.reviewItems[0].productId, id);
    assert.equal(h.scope.reviewItems[0].quantity, quantity);
    assert.equal(h.scope.reviewItems[0].unit, unit);
  }
});

test('unexpected recognized words are retained without an invented product separator', () => {
  for (const [name, rest, quantity] of [
    ['गुड़', 'अच्छा आधा किलो', 0.5],
    ['गुड़', 'बुलेट ढाई किलो', 2.5],
  ] as const) {
    const h = orderSetup();
    h.emit([name, rest]);
    assert.equal(h.scope.setFinalTranscriptValue, `${name} ${rest}`);
    assert.equal(h.scope.reviewItems.length, 1);
    assert.equal(h.scope.reviewItems[0].parsedQty, quantity);
  }
});

test('growing Android hypotheses converge to one sentence rather than multiplying orders', () => {
  const h = orderSetup();
  const hypotheses = [
    'चावल', 'चावल 2', 'चावल 2 किलो', 'चावल 2 किलो',
    'चावल 2 किलो चाय', 'चावल 2 किलो चाय पत्ती',
    'चावल 2 किलो चाय पत्ती 500', 'चावल 2 किलो चाय पत्ती 500 ग्राम',
    'चावल 2 किलो चाय पत्ती 500 ग्राम',
    'चावल 2 किलो चाय पत्ती 500 ग्राम तुवर',
    'चावल 2 किलो चाय पत्ती 500 ग्राम तुवर दाल',
    'चावल 2 किलो चाय पत्ती 500 ग्राम तुवर दाल 2 किलो',
  ];
  for (let i = 0; i < hypotheses.length; i++) {
    h.emit(hypotheses.slice(0, i + 1), i === hypotheses.length - 1);
    assert.equal(h.scope.setFinalTranscriptValue, hypotheses[i]);
  }
  assert.deepEqual(h.scope.reviewItems.map((item: any) => [item.productId, item.quantity]),
    [['rice', 2], ['tea', 0.5], ['dal', 2]]);
  h.emit(hypotheses);
  assert.equal(h.scope.reviewItems.length, 3);
});

test('overlap survives recognition restart; later interim updates replace the same result', () => {
  const h = orderSetup();
  h.emit(['चावल 2 किलो']);
  h.scope.recognitionRef.current.onend();
  h.emit(['चावल 2 किलो चाय पत्ती'], false);
  h.emit(['चावल 2 किलो चाय पत्ती 500 ग्राम']);
  assert.equal(h.scope.setFinalTranscriptValue, 'चावल 2 किलो चाय पत्ती 500 ग्राम');
  assert.equal(h.scope.reviewItems.length, 2);
  h.main.onPointerUp(h.pointer());
  h.advance(500);
  h.scope.recognitionRef.current.onend();
  assert.equal(h.scope.globalTranscriptRef.current, 'चावल 2 किलो चाय पत्ती 500 ग्राम');
});

test('quantity continuation survives recognition restart and explicit product separators still work', () => {
  const h = orderSetup();
  h.emit(['गुड़']);
  h.scope.recognitionRef.current.onend();
  h.emit(['आधा किलो']);
  assert.equal(h.scope.reviewItems.length, 1);
  assert.equal(h.scope.reviewItems[0].quantity, 0.5);
  const multiple = orderSetup();
  multiple.emit(['गुड़ आधा किलो', 'और नमक तीन पैकेट']);
  assert.deepEqual(multiple.scope.reviewItems.map((item: any) => [item.productId, item.quantity]),
    [['gud', 0.5], ['salt', 3]]);
});

test('catalogue-supported short Hindi vowel revisions reconcile without duplicated names', () => {
  for (const fragments of [['नमक', 'नामक तीन पैकेट'], ['नामक', 'नमक तीन पैकेट']]) {
    const h = orderSetup();
    h.emit(fragments);
    assert.equal(h.scope.setFinalTranscriptValue, 'नमक तीन पैकेट');
    assert.equal(h.scope.reviewItems.length, 1);
    assert.equal(h.scope.reviewItems[0].productId, 'salt');
    assert.equal(h.scope.reviewItems[0].quantity, 3);
  }
});

test('equivalent pulse-name revisions retain one product with the spoken quantity', () => {
  const h = orderSetup();
  h.emit(['चोला', 'छोले एक किलो']);
  assert.equal(h.scope.setFinalTranscriptValue, 'छोले एक किलो');
  assert.equal(h.scope.reviewItems.length, 1);
  assert.equal(h.scope.reviewItems[0].productId, 'chana');
  assert.equal(h.scope.reviewItems[0].quantity, 1);
});

test('matching quantity suffixes cannot erase a different short product name', () => {
  const h = orderSetup();
  const merge = h.scope.mergeOverlappingStrings;
  assert.equal(merge('गुड़ आधा किलो', 'अच्छा आधा किलो'), 'गुड़ आधा किलो अच्छा आधा किलो');
  assert.equal(merge('नमक', 'चमक तीन पैकेट'), 'नमक चमक तीन पैकेट');
  assert.equal(merge('चावल 2.5 किलो', 'चावल 3.5 किलो'), 'चावल 2.5 किलो चावल 3.5 किलो');
  h.emit(['अच्छा आधा किलो']);
  assert.equal(h.scope.reviewItems[0].productId, null);
  assert.equal(h.scope.reviewItems[0].parsedQty, 0.5);
});

test('saved defaults are consulted after recognition and do not change the transcript', () => {
  const h = orderSetup();
  h.scope.shop = { id: 'shop' };
  h.scope.catalog = [{ id: 'salt', name: 'Salt', localName: 'नमक', baseUnit: 'pc' }];
  h.scope.recalculateQtyAndUnit = voiceQuantityForProduct;
  const lookedUp: string[] = [];
  h.scope.voicePrefsCache = { get: (_shop: string, word: string) => {
    lookedUp.push(word);
    return { productId: 'salt' };
  } };
  h.emit(['गुड़ आधा किलो']);
  assert.equal(h.scope.setFinalTranscriptValue, 'गुड़ आधा किलो');
  assert.equal(h.scope.reviewItems[0].productId, 'gud');
  assert.ok(lookedUp.length > 0);
});
