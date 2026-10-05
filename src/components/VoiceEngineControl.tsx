'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildVoskGrammar } from '@/lib/vosk-grammar';
import { loadVosk, VoskRecognition, type LoadProgress, type VoskResources } from '@/lib/vosk-runtime';
import type { VoiceProduct } from '@/lib/voice-product-matcher';

export function useVoiceEngine(products: readonly VoiceProduct[]) {
  // Intentionally session-only: refresh always restores the existing engine.
  const [engine, setEngine] = useState<'browser' | 'vosk'>('browser');
  const [resources, setResources] = useState<VoskResources | null>(null);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [message, setMessage] = useState('');
  const pending = useRef<AbortController | null>(null);
  const resourceRef = useRef<VoskResources | null>(null);
  const sessionRef = useRef<VoskRecognition | null>(null);
  const grammar = useMemo(() => resources ? buildVoskGrammar(products, resources.vocabulary) : null, [products, resources]);

  useEffect(() => () => {
    pending.current?.abort();
    // Suppress callbacks into a page which is being unmounted.
    if (sessionRef.current) {
      sessionRef.current.onend = null;
      sessionRef.current.onerror = null;
      sessionRef.current.onresult = null;
      sessionRef.current.abort();
    }
    resourceRef.current?.dispose();
  }, []);

  async function prepare() {
    if (pending.current || resourceRef.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setMessage('');
    try {
      const loaded = await loadVosk(controller.signal, value => {
        if (!controller.signal.aborted) setProgress(value);
      });
      if (controller.signal.aborted) { loaded.dispose(); return; }
      resourceRef.current = loaded;
      setResources(loaded);
      setMessage('Ready. Select Vosk, then use Hold to Speak Order.');
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Could not load offline speech. Please retry.');
    } finally {
      if (pending.current === controller) { pending.current = null; setProgress(null); }
    }
  }

  function cancel() {
    const controller = pending.current;
    pending.current = null;
    controller?.abort();
    setProgress(null);
    setMessage('Download cancelled. Current recognition is available.');
  }

  function restore() {
    cancel();
    sessionRef.current?.abort();
    sessionRef.current = null;
    resourceRef.current?.dispose();
    resourceRef.current = null;
    setResources(null);
    setEngine('browser');
    setMessage('Current recognition restored.');
  }

  function createRecognition() {
    if (!resources || !grammar?.productPhrases) throw new Error('Prepare the model and add supported Hindi product names first.');
    const recognition = new VoskRecognition(resources, grammar.phrases, setMessage);
    sessionRef.current = recognition;
    return recognition;
  }

  return { engine, setEngine, resources, progress, message, grammar, prepare, cancel, restore, createRecognition };
}

export default function VoiceEngineControl({ voice, busy, onRestore }: {
  voice: ReturnType<typeof useVoiceEngine>; busy: boolean; onRestore: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return <div className="shrink-0 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs">
    <button type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}
      aria-controls="voice-engine-settings" className="flex w-full items-center justify-between py-1 text-left font-semibold text-slate-700">
      <span>Voice: {voice.engine === 'browser' ? 'Current recognition' : 'Vosk offline · experimental'}</span>
      <span>{expanded ? 'Hide settings' : 'Test Vosk'}</span>
    </button>
    {expanded && <div id="voice-engine-settings" className="mt-2 max-h-[38vh] space-y-3 overflow-y-auto pb-2">
      <p className="text-slate-600">Compare Hindi voice recognition using your store inventory. Review every product and quantity before adding to a bill.</p>
      <fieldset disabled={busy} className="flex flex-wrap gap-4 disabled:opacity-50">
        <legend className="sr-only">Recognition engine</legend>
        <label className="flex items-center gap-2"><input type="radio" name="voice-engine" checked={voice.engine === 'browser'} onChange={onRestore} />Current (default)</label>
        <label className="flex items-center gap-2"><input type="radio" name="voice-engine" checked={voice.engine === 'vosk'}
          disabled={!voice.resources || !voice.grammar?.productPhrases || Boolean(voice.progress)} onChange={() => voice.setEngine('vosk')} />Vosk offline (test)</label>
      </fieldset>
      {!voice.resources && !voice.progress && <button type="button" disabled={busy} onClick={() => void voice.prepare()}
        className="rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white disabled:opacity-50">Prepare Hindi model · about 42 MB</button>}
      {voice.progress && <div>
        <p role="status">{voice.progress.stage}</p>
        <progress aria-label={voice.progress.stage} max={100} value={voice.progress.percent} className="my-2 h-2 w-full" />
        <button type="button" onClick={voice.cancel} className="font-semibold text-indigo-700">Cancel download</button>
      </div>}
      {voice.grammar && <div className="text-slate-600">
        <p>{voice.grammar.covered} of {voice.grammar.covered + voice.grammar.unsupported.length} inventory products have a fully supported spoken name.</p>
        {voice.grammar.unsupported.length > 0 && <details className="mt-1">
          <summary className="cursor-pointer font-semibold">Names this model cannot fully recognize ({voice.grammar.unsupported.length})</summary>
          <p className="my-1">Add a familiar Hindi name or local alias in the product editor, or use Current recognition. Typing a new word does not train Vosk.</p>
          <ul className="max-h-28 list-inside list-disc overflow-y-auto">{voice.grammar.unsupported.map((name, i) => <li key={`${name}-${i}`}>{name}</li>)}</ul>
        </details>}
      </div>}
      {voice.message && <p role="status" className="rounded-lg bg-white p-2 text-slate-700">{voice.message}</p>}
      <p className="text-[11px] text-slate-500">After preparation, Vosk processes audio on this device. Cached speech files can be reused offline; the rest of the app may still need internet. Refreshing restores Current recognition.</p>
      {(voice.resources || voice.progress) && <button type="button" disabled={busy} onClick={onRestore}
        className="font-semibold text-indigo-700 disabled:opacity-50">Return to current recognition and unload Vosk</button>}
    </div>}
  </div>;
}
