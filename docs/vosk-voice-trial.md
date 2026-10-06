# Optional Vosk Hindi voice trial

The billing page starts with **Current recognition** on every reload. Expand
**Test Vosk**, prepare the model, and select **Vosk offline (test)**. Use the usual
hold-to-speak button or card correction. Final speech enters the existing order
parser, inventory matcher, and review screen. Partial speech is shown only in the
voice settings. Review product names and quantities before adding them to a bill.

Select **Current (default)** or **Return to current recognition and unload Vosk**
to release the offline model and resume browser recognition. Customer and Discover
voice flows continue to use their existing engines.

## Hosting

- `vosk-browser` is pinned to npm version `0.0.8`.
- `npm run dev` and `npm run build` generate `/voice/vosk-browser-0.0.8.js` from that
  package. `scripts/prepare-vosk-browser.mjs` disables upstream's duplicate
  IndexedDB filesystem persistence; the app caches the model in Cache Storage.
  Recognition and the bundled WebAssembly code are unchanged. Upgrades must review
  this checked transformation before changing the pinned version.
- Run **`npm run setup:vosk` before a deployment build** on any fresh checkout.
  This requires Python 3 and downloads the official `vosk-model-small-hi-0.22`
  archive from Alpha Cephei. It creates `public/models/vosk-hi/model.tar.gz`,
  `words.json`, and `manifest.json`. The large generated model archive is ignored
  by Git; **it must be included in the deployment's public assets**.
- The model is about 42 MB compressed; runtime memory is substantially larger.
  Static files are served from `/models/vosk-hi/`. Keep the archive, vocabulary,
  and manifest together. The manifest contains a SHA-256 checksum checked by the
  client before startup. The setup script reads the Hindi vocabulary from the
  model's embedded OpenFST symbol table when `words.txt` is absent.
- Serve over HTTPS (localhost also works). The runtime uses WebAssembly, Web
  Workers, AudioWorklet, and blob URLs. A custom Content Security Policy must allow
  these, including `worker-src blob:` and script loading from our blob URL.
- Audio is captured as mono through an AudioContext at **16 kHz** and processed
  in an AudioWorklet. Unsupported devices show an error with the current engine
  available as a fallback.
- The app caches the library, model, vocabulary, manifest, and audio worklet.
  Cache Storage can be disabled or evicted by the browser. Offline recognition
  works after preparation while the app is open; this does not make every app
  route or the inventory database available offline. Increase the runtime cache
  version when replacing any cached speech assets.
- The library and Hindi model use Apache-2.0 licenses. Model source and license
  are recorded in the generated manifest; the original model README is preserved
  inside the model archive.

## Vocabulary and uncertainty

Each microphone session builds a grammar from that store's product `name`,
`localName`, and `localAliases`, using the existing Hindi mapping for known
Hinglish words. All words in a phrase must exist in the model. Unsupported names
are listed in the panel; they are never silently shortened to a generic word.
Grammar also includes supported quantity/unit words and `[unk]` for rejection.
The grammar limits the decoder's word choices, but is not an exact SKU whitelist
and cannot teach new pronunciations. Inventory matching still determines the
product. Results containing `[unk]` or mean word confidence below `0.65` are
rejected. Confidence is a heuristic, not a guarantee of correct recognition.

Microphone permission denial, delayed permission grants after release, cancellation,
backgrounding, and unmounting release microphone resources. On release, queued
audio drains before a final result is requested. Slow devices have bounded audio
queues and a finalization timeout.

## Compare engines

Try the same 50–100 utterances with both engines on the intended Android phones:
Hindi names, Hinglish brands, quantities, similar sounding products, unavailable
products, and shop noise. Record the intended product, transcript, first suggestion,
quantity, time, and whether a wrong match occurred. Decide using correct product
selection and quantity, not just whether the transcript looks plausible. Keep the
current engine as default until the trial demonstrates an improvement.

Validation: `npm run test:voice`, `npx tsc --noEmit --incremental false`, and
`npm run build`. Live microphone accuracy needs actual speakers and shop devices.

## Exact rollback checkpoint

Before the experiment, the working tree was clean at
`4036c328fe8e07322b1851f7c70079208303782f`. A local branch named
`backup/pre-vosk-2026-10-06` and a verified standalone Git recovery archive
`pre-vosk-2026-10-06.bundle` preserve that application history. Preserve later work
before restoring source from this checkpoint. Switching the UI to Current does
not require a source rollback. Restoring source does not revert external browser
services or database contents.
