import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { buildVoskGrammar, acceptedVoskText } from './vosk-grammar';
import { VoskRecognition, type VoskResources } from './vosk-runtime';

test('grammar uses complete inventory names and aliases, never drops an unknown brand', () => {
  const words = new Set(['टाटा', 'नमक', 'साबुन', 'दो', '[unk]']);
  const grammar = buildVoskGrammar([
    { id: 'salt', name: 'Tata Namak 1kg' },
    { id: 'soap', name: 'Unheardbrand Soap', localName: 'अनसुना साबुन' },
    { id: 'alias', name: 'Other salt', localAliases: ['टाटा नमक'] },
  ], words);
  assert.equal(grammar.covered, 2);
  assert.deepEqual(grammar.unsupported, ['Unheardbrand Soap']);
  assert.equal(grammar.productPhrases, 1);
  assert(grammar.phrases.includes('टाटा नमक'));
  assert(!grammar.phrases.includes('साबुन'));
  assert(grammar.phrases.includes('[unk]'));
  assert(grammar.phrases.includes('दो'));
});

test('unknown and low-confidence final phrases never enter billing', () => {
  assert.equal(acceptedVoskText('टाटा [unk]'), '');
  assert.equal(acceptedVoskText('टाटा नमक', [{ conf: 0.4 }, { conf: 0.6 }]), '');
  assert.equal(acceptedVoskText(' टाटा नमक ', [{ conf: 0.95 }]), 'टाटा नमक');
});

test('the official Hindi vocabulary supports real catalog aliases', () => {
  const vocabulary = new Set<string>(JSON.parse(readFileSync('public/models/vosk-hi/words.json', 'utf8')));
  const grammar = buildVoskGrammar([{ id: 'salt', name: 'Tata Namak', localName: 'टाटा नमक' }], vocabulary);
  assert.equal(grammar.covered, 1);
  assert(grammar.phrases.includes('टाटा नमक'));
  assert(vocabulary.has('[unk]'));
});

const tick = () => new Promise<void>(resolve => setImmediate(resolve));

function harness(microphone?: Promise<MediaStream>) {
  const original = new Map<string, PropertyDescriptor | undefined>();
  const globals: Record<string, unknown> = {};
  const tracks = [{ stops: 0, stop() { this.stops++; }, addEventListener() {} }];
  const stream = { getTracks: () => tracks } as unknown as MediaStream;
  const nodes: MockNode[] = [];
  const contexts: MockContext[] = [];
  const recognizers: MockRecognizer[] = [];
  class MockNode {
    port = { onmessage: null as ((event: any) => void) | null, commands: [] as string[],
      postMessage: (value: string) => { this.port.commands.push(value); }, close() {} };
    constructor() { nodes.push(this); }
    connect() {} disconnect() {}
    audio() { this.port.onmessage?.({ data: { audio: new Float32Array(2048) } }); }
    flush() { this.port.onmessage?.({ data: { flushed: true } }); }
  }
  class MockContext {
    sampleRate = 16000;
    state = 'running';
    closed = 0;
    audioWorklet = { async addModule() {} };
    constructor() { contexts.push(this); }
    async resume() {}
    async close() { this.closed++; this.state = 'closed'; }
    createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
    destination = {};
  }
  class MockRecognizer {
    handlers = new Map<string, (event: any) => void>();
    finalRequests = 0; removed = 0; chunks = 0;
    constructor(public rate: number, public grammar: string) { recognizers.push(this); }
    setWords() {}
    on(event: string, handler: (event: any) => void) { this.handlers.set(event, handler); }
    acceptWaveformFloat(_buffer: Float32Array, rate: number) { assert.equal(rate, 16000); this.chunks++; }
    retrieveFinalResult() { this.finalRequests++; }
    remove() { this.removed++; }
    emit(event: string, result: any) { this.handlers.get(event)?.({ event, result }); }
  }
  globals.AudioContext = MockContext;
  globals.AudioWorkletNode = MockNode;
  globals.navigator = { mediaDevices: { getUserMedia: () => microphone || Promise.resolve(stream) } };
  for (const [name, value] of Object.entries(globals)) {
    original.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  const status: string[] = [];
  const speech = new VoskRecognition({ model: { KaldiRecognizer: MockRecognizer }, workletUrl: 'blob:test' } as unknown as VoskResources,
    ['टाटा नमक', '[unk]'], text => status.push(text));
  return { speech, nodes, contexts, recognizers, tracks, stream, status, restore() {
    speech.onend = null;
    speech.abort();
    for (const [name, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  } };
}

test('release drains all queued audio before finalization and releases the microphone', async () => {
  const h = harness();
  try {
    const results: string[] = [];
    let ends = 0;
    h.speech.onresult = event => results.push(event.results.map(result => result[0].transcript).join(' '));
    h.speech.onend = () => ends++;
    h.speech.start();
    await tick();
    const node = h.nodes[0], recognizer = h.recognizers[0];
    assert.equal(recognizer.rate, 16000);
    assert.deepEqual(JSON.parse(recognizer.grammar), ['टाटा नमक', '[unk]']);
    node.audio(); node.audio();
    h.speech.stop(); node.flush();
    assert.equal(h.tracks[0].stops, 1);
    assert.equal(h.contexts[0].closed, 1);
    assert.equal(recognizer.finalRequests, 0);
    recognizer.emit('partialresult', { partial: 'टाटा' });
    assert.equal(results.length, 0);
    assert.equal(recognizer.finalRequests, 0);
    recognizer.emit('result', { text: 'टाटा नमक', result: [{ conf: 0.9 }] });
    assert.equal(recognizer.finalRequests, 1);
    assert.equal(ends, 0);
    recognizer.emit('result', { text: '' });
    assert.deepEqual(results, ['टाटा नमक']);
    assert.equal(ends, 1);
    assert.equal(recognizer.removed, 1);
  } finally { h.restore(); }
});

test('release while permission is pending cannot reopen the microphone', async () => {
  let grant!: (stream: MediaStream) => void;
  const h = harness(new Promise(resolve => { grant = resolve; }));
  try {
    let starts = 0;
    h.speech.onstart = () => starts++;
    h.speech.start(); await tick();
    h.speech.stop();
    grant(h.stream); await tick();
    assert.equal(starts, 0);
    assert.equal(h.tracks[0].stops, 1);
    assert.equal(h.contexts[0].closed, 1);
    assert.equal(h.recognizers.length, 0);
  } finally { h.restore(); }
});

test('permission denial ends the session, reports a clear error, and closes audio', async () => {
  let deny!: (reason: Error) => void;
  const h = harness(new Promise((_resolve, reject) => { deny = reject; }));
  try {
    let error = '', ends = 0;
    h.speech.onerror = event => { error = event.error; };
    h.speech.onend = () => ends++;
    h.speech.start(); await tick();
    deny(new DOMException('Denied', 'NotAllowedError')); await tick();
    assert.equal(error, 'not-allowed');
    assert.equal(ends, 1);
    assert.equal(h.contexts[0].closed, 1);
  } finally { h.restore(); }
});

test('abort ignores late results and an old recognizer cannot affect a restarted session', async () => {
  const h = harness();
  try {
    let results = 0;
    h.speech.onresult = () => results++;
    h.speech.start(); await tick();
    const old = h.recognizers[0];
    h.speech.abort();
    h.speech.start(); await tick();
    old.emit('result', { text: 'टाटा नमक' });
    assert.equal(results, 0);
    h.nodes[1].audio();
    h.recognizers[1].emit('result', { text: '[unk]' });
    assert.equal(results, 0);
    assert.equal(h.tracks[0].stops, 1);
  } finally { h.restore(); }
});
