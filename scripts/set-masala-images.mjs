/**
 * Sets images for masala products using Gemini + BigBasket CDN pattern.
 * BigBasket uses predictable CDN URLs for major brands.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}

const firebaseConfig = {
  apiKey: 'AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk',
  authDomain: 'retlex-ai.firebaseapp.com',
  projectId: 'retlex-ai',
  storageBucket: 'retlex-ai.firebasestorage.app',
  messagingSenderId: '339712048398',
  appId: '1:339712048398:web:578ac498b0c942db7aab5f',
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const SHOP_ID = 'Yvgf5Us3pdNGHa0ljBGr';
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchSafe(url, opts = {}, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0', ...(opts.headers || {}) }
    });
    clearTimeout(t); return r;
  } catch { clearTimeout(t); return null; }
}

// Ask Gemini for a batch of image URLs at once (more efficient)
async function geminiImageBatch(products) {
  if (!GEMINI_KEY) return {};
  const list = products.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
  const prompt = `For each of these Indian masala/spice products, provide ONE direct working image URL from bigbasket.com CDN (format: https://www.bigbasket.com/media/uploads/p/l/XXXXX_X-name.jpg) or any reliable Indian e-commerce CDN.

Products:
${list}

Reply in this exact format (one per line):
1: URL_OR_null
2: URL_OR_null
...

Only provide real URLs you are confident exist. Use null if unsure.`;

  const res = await fetchSafe(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    },
    30000
  );
  if (!res?.ok) return {};
  try {
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const result = {};
    for (const line of text.split('\n')) {
      const m = line.match(/^(\d+):\s*(https?:\/\/[^\s]+)/);
      if (m) result[parseInt(m[1]) - 1] = m[2];
    }
    return result;
  } catch { return {}; }
}

async function verifyUrl(url) {
  if (!url || url === 'null') return false;
  const res = await fetchSafe(url, {}, 6000);
  return res?.ok;
}

async function main() {
  console.log('🔍 Fetching masala products without images...\n');
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', SHOP_ID)));
  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => !p.imageUrl && p.category === 'Masala & Spices');

  console.log(`Found ${products.length} masala products needing images\n`);

  // Process in batches of 10
  const BATCH = 10;
  let updated = 0, failed = 0;

  for (let i = 0; i < products.length; i += BATCH) {
    const batch = products.slice(i, i + BATCH);
    console.log(`\n📦 Batch ${Math.floor(i/BATCH)+1}: products ${i+1}–${Math.min(i+BATCH, products.length)}`);

    const urlMap = await geminiImageBatch(batch);
    console.log(`   Gemini returned ${Object.keys(urlMap).length} URLs`);

    for (let j = 0; j < batch.length; j++) {
      const p = batch[j];
      const suggestedUrl = urlMap[j];
      process.stdout.write(`   [${i+j+1}] ${p.name.slice(0, 45).padEnd(45)} `);

      if (!suggestedUrl) { process.stdout.write('❌ no URL\n'); failed++; continue; }

      const valid = await verifyUrl(suggestedUrl);
      if (valid) {
        await updateDoc(doc(db, 'products', p.id), { imageUrl: suggestedUrl });
        process.stdout.write(`✅\n`);
        updated++;
      } else {
        process.stdout.write(`⚠️  URL invalid\n`);
        failed++;
      }
      await sleep(200);
    }

    await sleep(1500); // Rate limit between batches
  }

  console.log(`\n\n✅ Updated: ${updated}  ❌ Failed/No URL: ${failed}`);
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
