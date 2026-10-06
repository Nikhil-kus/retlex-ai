import type { Model, KaldiRecognizer } from 'vosk-browser';
import { acceptedVoskText } from './vosk-grammar';

export type LoadProgress = { stage: string; percent?: number };
export type VoskResources = { model: Model; vocabulary: Set<string>; workletUrl: string; dispose: () => void };
const CACHE = 'retlex-vosk-hi-0.22-v3';
const BASE = '/models/vosk-hi/';

async function cachedDownload(url: string, signal: AbortSignal, progress?: (received: number, total: number) => void): Promise<Blob> {
  let cache: Cache | undefined;
  try { cache = await caches.open(CACHE); } catch { /* Private mode may disable persistent storage. */ }
  const cached = await cache?.match(url);
  if (cached) return cached.blob();
  const response = await fetch(url, { signal });
  if (!response.ok) {
    console.error(`Vosk asset request failed: ${url} (${response.status})`);
    throw new Error(`Offline voice files are unavailable (${response.status}). Please use Current recognition while the site is updated.`);
  }
  const total = Number(response.headers.get('content-length')) || 0;
  const reader = response.body?.getReader();
  if (!reader) throw new Error('This browser cannot stream the speech model download.');
  const chunks: ArrayBuffer[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value.slice().buffer);
    received += value.length;
    progress?.(received, total);
  }
  const blob = new Blob(chunks, { type: response.headers.get('content-type') || 'application/octet-stream' });
  try { await cache?.put(url, new Response(blob)); } catch { /* Still usable this session when storage is full. */ }
  return blob;
}

async function loadLibrary(signal: AbortSignal): Promise<{ Model: typeof Model }> {
  const surface = window as Window & { Vosk?: { Model: typeof Model } };
  if (surface.Vosk) return surface.Vosk;
  // Generated from the pinned npm package during dev/build. Cache this too so
  // preparing Vosk again in an already-open app does not need an internet request.
  const library = await cachedDownload('/voice/vosk-browser-0.0.8.js', signal);
  signal.throwIfAborted();
  const url = URL.createObjectURL(new Blob([library], { type: 'text/javascript' }));
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const cleanup = () => { signal.removeEventListener('abort', abort); script.remove(); URL.revokeObjectURL(url); };
    const abort = () => { cleanup(); reject(new DOMException('Cancelled', 'AbortError')); };
    script.src = url;
    script.onload = () => { cleanup(); resolve(); };
    script.onerror = () => { cleanup(); reject(new Error('Speech engine could not load. Check browser support and retry.')); };
    signal.addEventListener('abort', abort, { once: true });
    document.head.appendChild(script);
    if (signal.aborted) abort();
  });
  if (!surface.Vosk) throw new Error('Speech engine is unavailable. Please retry.');
  return surface.Vosk;
}

export async function loadVosk(signal: AbortSignal, progress: (value: LoadProgress) => void): Promise<VoskResources> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Voice needs HTTPS or localhost and microphone support.');
  if (typeof WebAssembly === 'undefined' || !window.AudioWorkletNode) throw new Error('This browser does not support offline voice. Use Current recognition.');
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('retlex-vosk-hi-') && key !== CACHE).map(key => caches.delete(key)));
  } catch { /* Persistence is optional; do not block recognition in private mode. */ }
  progress({ stage: 'Loading speech engine…' });
  const { Model } = await loadLibrary(signal);
  signal.throwIfAborted();
  const manifestBlob = await cachedDownload(BASE + 'manifest.json', signal);
  const manifest = JSON.parse(await manifestBlob.text()) as { bytes: number; sha256: string };
  progress({ stage: 'Downloading Hindi model…', percent: 0 });
  const archive = await cachedDownload(BASE + 'model.tar.gz', signal, (received, total) => {
    progress({ stage: `Downloading Hindi model… ${(received / 1048576).toFixed(1)} MB`, percent: Math.min(99, Math.round(100 * received / (total || manifest.bytes))) });
  });
  const [wordBlob, workletBlob] = await Promise.all([
    cachedDownload(BASE + 'words.json', signal),
    cachedDownload('/voice/vosk-capture.js', signal),
  ]);
  progress({ stage: 'Checking model files…' });
  const digest = await crypto.subtle.digest('SHA-256', await archive.arrayBuffer());
  const hash = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
  if (hash !== manifest.sha256 || archive.size !== manifest.bytes) {
    try { await caches.delete(CACHE); } catch { /* Cache API may be unavailable. */ }
    throw new Error('Speech download was incomplete. Please prepare Vosk again.');
  }
  signal.throwIfAborted();
  const vocabulary = new Set<string>(JSON.parse(await wordBlob.text()));
  const modelUrl = URL.createObjectURL(archive);
  const workletUrl = URL.createObjectURL(new Blob([workletBlob], { type: 'text/javascript' }));
  let model: Model | undefined;
  try {
    progress({ stage: 'Starting Hindi model…' });
    model = new Model(modelUrl, -1);
    const loadingModel = model;
    loadingModel.addEventListener('diagnostic', event => {
      console.warn('Vosk worker:', (event as CustomEvent<{ message: string }>).detail.message);
    });
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timeout);
        signal.removeEventListener('abort', abort);
        if (error) reject(error); else resolve();
      };
      const abort = () => finish(new DOMException('Cancelled', 'AbortError'));
      const timeout = setTimeout(() => finish(new Error('Model initialization timed out. Try again or use Current recognition.')), 120000);
      signal.addEventListener('abort', abort, { once: true });
      loadingModel.on('load', event => finish(event.event === 'load' && event.result ? undefined : new Error('Hindi model could not start.')));
      loadingModel.on('error', event => {
        console.error('Vosk model initialization:', JSON.stringify(event));
        finish(new Error('Offline speech engine failed to load.'));
      });
      if (signal.aborted) abort();
    });
    signal.throwIfAborted();
    const readyModel = model;
    return { model, vocabulary, workletUrl, dispose: () => {
      readyModel.terminate();
      URL.revokeObjectURL(modelUrl);
      URL.revokeObjectURL(workletUrl);
    } };
  } catch (error) {
    model?.terminate();
    URL.revokeObjectURL(modelUrl);
    URL.revokeObjectURL(workletUrl);
    throw error;
  }
}

type SpeechResult = { 0: { transcript: string }; isFinal: boolean; length: number };

/** Small Web Speech-shaped adapter. The existing billing parser stays untouched.
 * Only final, accepted segments enter billing; partial text is displayed in the
 * experiment panel. A recognizer gets a fresh grammar for each microphone session.
 */
export class VoskRecognition {
  lang = 'hi-IN';
  continuous = true;
  interimResults = true;
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string; message: string }) => void) | null = null;
  onresult: ((event: { results: SpeechResult[] }) => void) | null = null;
  private stream?: MediaStream;
  private context?: AudioContext;
  private node?: AudioWorkletNode;
  private source?: MediaStreamAudioSourceNode;
  private recognizer?: KaldiRecognizer;
  private active = false;
  private stopping = false;
  private flushed = false;
  private pending = 0;
  private finalRequested = false;
  private generation = 0;
  private finals: SpeechResult[] = [];
  private timer?: ReturnType<typeof setTimeout>;
  constructor(private resources: VoskResources, private grammar: string[], private status: (text: string) => void) {}

  start() {
    if (this.active) throw new Error('Already listening');
    this.active = true;
    this.stopping = this.flushed = this.finalRequested = false;
    this.pending = 0;
    this.finals = [];
    const generation = ++this.generation;
    void this.open(generation);
  }

  private async open(generation: number) {
    const live = () => this.active && generation === this.generation && !this.stopping;
    try {
      this.status('Allow microphone access, then speak…');
      // Create/resume inside the user gesture; browsers perform real resampling
      // to this rate. A getUserMedia sampleRate constraint alone is insufficient.
      const context = new AudioContext({ sampleRate: 16000 });
      this.context = context;
      await context.resume();
      if (!live()) return;
      if (context.sampleRate !== 16000) throw new Error('This device cannot capture 16 kHz audio. Use Current recognition.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true,
      }, video: false });
      if (!live()) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      await context.audioWorklet.addModule(this.resources.workletUrl);
      if (!live()) return;
      const recognizer = new this.resources.model.KaldiRecognizer(16000, JSON.stringify(this.grammar));
      this.recognizer = recognizer;
      recognizer.setWords(true); // Metadata only; grammar is passed in the constructor.
      recognizer.on('error', event => {
        if (this.active && generation === this.generation) this.fail('audio-capture', event.event === 'error' ? event.error : 'Speech engine failed');
      });
      recognizer.on('partialresult', event => {
        if (!this.active || generation !== this.generation || event.event !== 'partialresult') return;
        this.pending = Math.max(0, this.pending - 1);
        if (event.result.partial) this.status(`Hearing: ${event.result.partial}`);
        this.requestFinalWhenDrained();
      });
      recognizer.on('result', event => {
        if (!this.active || generation !== this.generation || event.event !== 'result') return;
        const finalResponse = this.finalRequested;
        if (!finalResponse) this.pending = Math.max(0, this.pending - 1);
        const text = acceptedVoskText(event.result.text, event.result.result);
        if (text) {
          this.finals.push({ 0: { transcript: text }, isFinal: true, length: 1 });
          this.onresult?.({ results: [...this.finals] });
          this.status(`Recognized: ${text}`);
        } else if (event.result.text) {
          this.status('No reliable match for that phrase. Try again or use Current recognition.');
        }
        if (finalResponse) this.finish(); else this.requestFinalWhenDrained();
      });
      const node = new AudioWorkletNode(context, 'retlex-vosk-capture');
      this.node = node;
      node.port.onmessage = event => {
        if (!this.active || generation !== this.generation) return;
        if (event.data.audio) {
          // Bound the queued audio on slower phones instead of growing memory forever.
          if (this.pending >= 80) { this.fail('audio-capture', 'This device is processing speech too slowly. Try a shorter phrase or Current recognition.'); return; }
          this.pending++;
          try { recognizer.acceptWaveformFloat(event.data.audio, 16000); }
          catch { this.fail('audio-capture', 'Could not process microphone audio. Please retry.'); return; }
        }
        if (event.data.flushed) {
          this.flushed = true;
          this.disconnectAudio();
          this.requestFinalWhenDrained();
        }
      };
      this.source = context.createMediaStreamSource(stream);
      this.source.connect(node);
      // Worklet output is all zeros; connecting keeps it scheduled without echo.
      node.connect(context.destination);
      stream.getTracks().forEach(track => track.addEventListener('ended', () => {
        if (this.active && !this.stopping) this.fail('audio-capture', 'Microphone disconnected.');
      }));
      this.status('Listening offline… release to finish.');
      this.onstart?.();
    } catch (error) {
      if (!this.active || generation !== this.generation) return;
      const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      this.fail(denied ? 'not-allowed' : 'audio-capture', denied ? 'Microphone access was denied. Allow it in your browser settings.' : error instanceof Error ? error.message : 'Microphone could not start.');
    }
  }

  stop() {
    if (!this.active || this.stopping) return;
    this.stopping = true;
    if (!this.node) { this.finish(); return; }
    this.node.port.postMessage('flush');
    this.timer = setTimeout(() => this.fail('audio-capture', 'Speech processing timed out. Try a shorter phrase.'), 10000);
  }

  abort() {
    if (!this.active) return;
    this.finish();
  }

  private requestFinalWhenDrained() {
    if (this.active && this.stopping && this.flushed && !this.pending && !this.finalRequested) {
      this.finalRequested = true;
      this.recognizer?.retrieveFinalResult();
    }
  }

  private fail(error: string, message: string) {
    if (!this.active) return;
    this.status(message);
    this.onerror?.({ error, message });
    this.finish();
  }

  private disconnectAudio() {
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;
    this.source?.disconnect();
    this.source = undefined;
    this.node?.disconnect();
    this.node?.port.close();
    this.node = undefined;
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => undefined);
    this.context = undefined;
  }

  private finish() {
    if (!this.active) return;
    this.active = false;
    this.generation++;
    clearTimeout(this.timer);
    this.disconnectAudio();
    this.recognizer?.remove();
    this.recognizer = undefined;
    this.onend?.();
  }
}
