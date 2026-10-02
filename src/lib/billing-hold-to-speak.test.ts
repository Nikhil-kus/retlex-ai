import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { transpileModule, ScriptTarget } from 'typescript';
import { parseVoiceItems } from './voice-parser';
import { createVoiceProductMatcher, voiceQuantityForProduct } from './voice-product-matcher';
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
    heldInputRef: { current: null }, baseReviewItemsRef: { current: [] },
    itemOverridesRef: { current: {} }, globalTranscriptRef: { current: '' },
    currentBreathRef: { current: '' }, matchCacheRef: { current: new Map() },
    voiceMatcherRef: { current: createVoiceProductMatcher([{ id: 'lux', name: 'Lux Soap', price: 20, baseUnit: 'pc' }]) },
    _isDebug: false, parseVoiceItems, voiceQuantityForProduct, canCorrectProductByVoice,
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
  scope.joinSpeechFragments = new Function('scope', `with(scope) { ${compile('  const joinSpeechFragments =', '  const recalculateQtyAndUnit =')} return joinSpeechFragments; }`)(scope);
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

function emitSegments(h: ReturnType<typeof setup>, texts: string[], isFinal = true) {
  h.scope.recognitionRef.current.onresult({
    results: texts.map(transcript => ({ 0: { transcript }, isFinal })),
  });
}

test('split Hindi speech keeps the quantity on one item, including screenshot transcripts', () => {
  for (const [texts, quantity, unit] of [
    [['', '', 'गुड़', 'आधा किलो'], 0.5, 'kg'],
    [['गुड़', 'ढाई किलो'], 2.5, 'kg'],
    [['नमक', 'तीन पैकेट'], 3, 'pc'],
    [['गुड़', 'अच्छा आधा किलो'], 0.5, 'kg'],
    [['गुड़', 'बुलेट ढाई किलो'], 2.5, 'kg'],
    [['नमक', 'नामक तीन पैकेट'], 3, 'pc'],
    [['गुड़', '2.5 किलो'], 2.5, 'kg'],
  ] as const) {
    const h = setup();
    h.scope.reviewItems = [];
    h.scope.voiceMatcherRef.current = createVoiceProductMatcher([
      { id: 'jaggery', name: 'Jaggery', localName: 'गुड़', baseUnit: 'kg', price: 45 },
      { id: 'salt', name: 'Salt', localName: 'नमक', baseUnit: 'pc', price: 10 },
    ]);
    h.main.onPointerDown(h.pointer());
    emitSegments(h, [...texts]);
    assert.equal(h.scope.reviewItems.length, 1, texts.join(' / '));
    assert.equal(h.scope.reviewItems[0].parsedQty, quantity);
    assert.equal(h.scope.reviewItems[0].parsedUnit, unit);
    assert.equal(h.scope.setFinalTranscriptValue, texts.filter(Boolean).join(' '));
    if (!texts.some(text => /अच्छा|बुलेट|नामक/.test(text))) {
      assert.equal(h.scope.reviewItems[0].productId, texts.some(text => text === 'नमक') ? 'salt' : 'jaggery');
      assert.equal(h.scope.reviewItems[0].quantity, quantity);
    }
  }
});

test('interim revisions replace the earlier item instead of retaining it', () => {
  const h = setup();
  h.scope.reviewItems = [];
  h.main.onPointerDown(h.pointer());
  emitSegments(h, ['गुड़'], false);
  emitSegments(h, ['नमक तीन पैकेट']);
  assert.equal(h.scope.reviewItems.length, 1);
  assert.equal(h.scope.reviewItems[0].parsedQty, 3);
  assert.equal(h.scope.setFinalTranscriptValue, 'नमक तीन पैकेट');
});

test('recognition restart mid-phrase does not create a product boundary or duplicate results', () => {
  const h = setup();
  h.scope.reviewItems = [];
  h.main.onPointerDown(h.pointer());
  emitSegments(h, ['गुड़']);
  const rec = h.scope.recognitionRef.current;
  rec.onend();
  emitSegments(h, ['आधा किलो']);
  emitSegments(h, ['आधा किलो']);
  assert.equal(h.scope.reviewItems.length, 1);
  assert.equal(h.scope.reviewItems[0].parsedQty, 0.5);
  h.main.onPointerUp(h.pointer());
  h.advance(500);
  rec.onend();
  assert.equal(h.scope.globalTranscriptRef.current, 'गुड़ आधा किलो');
});

test('explicit conjunctions still separate products and repeated quantities are not discarded', () => {
  const h = setup();
  h.scope.reviewItems = [];
  h.main.onPointerDown(h.pointer());
  emitSegments(h, ['lux soap 2', 'and mystery widget 3']);
  assert.equal(h.scope.reviewItems.length, 2);
  assert.equal(h.scope.reviewItems[0].quantity, 2);
  assert.equal(h.scope.reviewItems[1].quantity, 3);
  emitSegments(h, ['lux soap 2', 'lux soap 2']);
  assert.equal(h.scope.reviewItems.length, 1);
  assert.equal(h.scope.reviewItems[0].quantity, 4);
});
