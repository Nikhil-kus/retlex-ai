import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { transpileModule, ScriptTarget } from 'typescript';
import { parseVoiceItems } from './voice-parser';
import { createVoiceProductMatcher, voiceQuantityForProduct } from './voice-product-matcher';

// Exercise the actual page handlers with browser recognition events under our control.
const source = readFileSync('src/app/billing/page.tsx', 'utf8');
const compile = (start: string, end: string) => transpileModule(
  source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start))),
  { compilerOptions: { target: ScriptTarget.ES2022 } },
).outputText;

function setup() {
  const unchanged = { name: 'Existing', productId: 'existing', quantity: 1 };
  const original = { name: 'wrong name', productId: null, quantity: 3, unit: 'pc', parsedQty: 3, parsedUnit: 'pc', hasExplicitQty: true };
  const scope: any = {
    reviewItems: [unchanged, original],
    recognitionRef: { current: null }, isListeningRef: { current: false },
    heldInputRef: { current: null }, baseReviewItemsRef: { current: [] },
    itemOverridesRef: { current: {} }, globalTranscriptRef: { current: '' },
    currentBreathRef: { current: '' }, matchCacheRef: { current: new Map() },
    voiceMatcherRef: { current: createVoiceProductMatcher([{ id: 'lux', name: 'Lux Soap', price: 20, baseUnit: 'pc' }]) },
    _isDebug: false, parseVoiceItems, voiceQuantityForProduct,
    mergeOverlappingStrings: (a: string, b: string) => [a, b].filter(Boolean).join(' '),
    getSuggestions: () => ({ brandVariants: [], sizeVariants: [] }),
    useEffect: (effect: () => () => void) => { scope.cleanup = effect(); },
  };
  for (const name of ['setCorrectingItemIdx', 'setVoiceMessage', 'setFinalTranscript', 'setSelectedBrandPerItem', 'setOpenSuggestionIdx', 'setIsListening', 'setMode']) {
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
  scope.processVoiceTextToItems = new Function('scope', `with(scope) { ${compile('  const processVoiceTextToItems =', '  const getSuggestions =')} return processVoiceTextToItems; }`)(scope);
  const handlers = new Function('scope', `with(scope) { ${compile('  const startVoiceInput =', '  const router =')} return { holdToSpeak }; }`)(scope);
  const card = handlers.holdToSpeak(1);
  const main = handlers.holdToSpeak();
  const pointer = (id = 1, interactive = false) => ({
    isPrimary: true, button: 0, pointerId: id, preventDefault() {},
    currentTarget: { setPointerCapture() {} }, target: { closest: () => interactive },
  });
  const speak = (text: string) => scope.recognitionRef.current.onresult({ results: [{ 0: { transcript: text }, isFinal: true }] });
  return { scope, card, main, pointer, speak, listeners, unchanged, original };
}

test('release stops the main microphone and a delayed permission grant cannot reopen it', () => {
  const h = setup();
  h.main.onPointerDown(h.pointer());
  const rec = h.scope.recognitionRef.current;
  assert.equal(rec.starts, 1);
  h.main.onPointerUp(h.pointer(2));
  assert.equal(rec.stops, 0);
  h.main.onPointerUp(h.pointer());
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
  assert.equal(rec.stops, 1);
});
