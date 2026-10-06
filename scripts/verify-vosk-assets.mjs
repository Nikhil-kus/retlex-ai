// Fail the deployment build if the browser would receive a missing/corrupt model.
// All assets are shipped in the repository; no Python or model download is needed
// on the hosting provider. The setup command is only for model maintenance.
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modelDir = resolve(root, 'public/models/vosk-hi');
const required = [
  'public/models/vosk-hi/manifest.json',
  'public/models/vosk-hi/words.json',
  'public/models/vosk-hi/model.tar.gz',
  'public/voice/vosk-browser-0.0.8.js',
  'public/voice/vosk-capture.js',
];
for (const file of required) {
  try {
    const info = statSync(resolve(root, file));
    if (!info.isFile() || !info.size) throw new Error('Empty asset');
  } catch {
    throw new Error(`Missing Vosk deployment asset: ${file}. Restore repository assets or run npm run setup:vosk before building.`);
  }
}
const manifest = JSON.parse(readFileSync(resolve(modelDir, 'manifest.json'), 'utf8'));
const archive = readFileSync(resolve(modelDir, 'model.tar.gz'));
if (archive.length !== manifest.bytes || createHash('sha256').update(archive).digest('hex') !== manifest.sha256) {
  throw new Error('Vosk model does not match its manifest. Run npm run setup:vosk to rebuild the model assets together.');
}
const vocabulary = JSON.parse(readFileSync(resolve(modelDir, 'words.json'), 'utf8'));
if (!Array.isArray(vocabulary) || !vocabulary.includes('[unk]')) {
  throw new Error('Vosk vocabulary is invalid. Restore words.json or rerun the model setup.');
}
console.log('Verified all Vosk public assets, Hindi vocabulary, and model checksum for deployment.');
