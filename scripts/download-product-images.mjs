/**
 * ONE-TIME SCRIPT: Auto-download product images
 *
 * Sources tried in order:
 *   1. Open Food Facts API (free, no key, great for packaged goods)
 *   2. DuckDuckGo image search (free, no key)
 *   3. Fallback: default placeholder
 *
 * Usage:
 *   node scripts/download-product-images.mjs
 *
 * Optional: set GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX in .env for better results
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'fs';
import { pipeline } from 'stream/promises';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Load .env ─────────────────────────────────────────────────────────────────
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

// ── Firebase config ───────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            'AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk',
  authDomain:        'retlex-ai.firebaseapp.com',
  projectId:         'retlex-ai',
  storageBucket:     'retlex-ai.firebasestorage.app',
  messagingSenderId: '339712048398',
  appId:             '1:339712048398:web:578ac498b0c942db7aab5f',
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db  = getFirestore(app);

// ── Constants ─────────────────────────────────────────────────────────────────
const OUTPUT_DIR    = path.join(__dirname, '..', 'public', 'products');
const DEFAULT_IMAGE = '/products/default.png';
const DELAY_MS      = 800;

const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY || process.env.GOOGLE_VISION_API_KEY;
const GOOGLE_CSE_CX      = process.env.GOOGLE_CSE_CX;

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** Fetch with timeout, returns Response or null */
async function fetchSafe(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/** Download binary from url to destPath. Follows redirects. Returns true/false. */
async function downloadImage(imageUrl, destPath, depth = 0) {
  if (depth > 4) return false;
  return new Promise(resolve => {
    const proto = imageUrl.startsWith('https') ? https : http;
    try {
      const req = proto.get(imageUrl, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
        if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
          downloadImage(res.headers.location, destPath, depth + 1).then(resolve);
          return;
        }
        if (res.statusCode !== 200) { resolve(false); return; }
        const ct = res.headers['content-type'] || '';
        if (!ct.startsWith('image/')) { resolve(false); return; }
        const writer = createWriteStream(destPath);
        pipeline(res, writer).then(() => resolve(true)).catch(() => resolve(false));
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    } catch { resolve(false); }
  });
}

// ── Source 1: Open Food Facts ─────────────────────────────────────────────────
async function searchOpenFoodFacts(name) {
  const query = encodeURIComponent(name);
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,image_front_url,image_url`;
  const res = await fetchSafe(url, 12000);
  if (!res || !res.ok) return null;
  try {
    const data = await res.json();
    const products = (data.products || []).filter(p =>
      (p.image_front_url || p.image_url) &&
      (p.product_name || '').toLowerCase().includes(name.split(' ')[0].toLowerCase())
    );
    return products[0]?.image_front_url || products[0]?.image_url || null;
  } catch { return null; }
}

// ── Source 2: DuckDuckGo image search ────────────────────────────────────────
async function searchDuckDuckGo(query) {
  // Step 1: get vqd token
  const initUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
  const initRes = await fetchSafe(initUrl, 10000);
  if (!initRes || !initRes.ok) return null;
  const html = await initRes.text();
  const vqdMatch = html.match(/vqd=['"]([^'"]+)['"]/);
  if (!vqdMatch) return null;
  const vqd = vqdMatch[1];

  // Step 2: fetch image results
  const imgUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1&v7exp=a`;
  const imgRes = await fetchSafe(imgUrl, 10000);
  if (!imgRes || !imgRes.ok) return null;
  try {
    const data = await imgRes.json();
    const results = (data.results || []).filter(r => {
      const url = (r.image || '').toLowerCase();
      const title = (r.title || '').toLowerCase();
      if (url.endsWith('.svg') || url.endsWith('.gif')) return false;
      if (title.includes('logo') || title.includes('icon')) return false;
      return true;
    });
    return results[0]?.image || null;
  } catch { return null; }
}

// ── Source 3: Google Custom Search (if keys available) ───────────────────────
async function searchGoogle(query) {
  if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_CX || GOOGLE_CSE_CX.includes('your_')) return null;
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', GOOGLE_CSE_API_KEY);
  url.searchParams.set('cx', GOOGLE_CSE_CX);
  url.searchParams.set('q', query);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('num', '5');
  url.searchParams.set('imgType', 'photo');
  const res = await fetchSafe(url.toString(), 10000);
  if (!res || !res.ok) return null;
  try {
    const data = await res.json();
    const items = (data.items || []).filter(i => {
      const l = (i.link || '').toLowerCase();
      return !l.endsWith('.svg') && !l.endsWith('.gif');
    });
    return items[0]?.link || null;
  } catch { return null; }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  ensureDir(OUTPUT_DIR);

  console.log('📦  Fetching all products from Firestore…');
  const snapshot = await getDocs(collection(db, 'products'));
  const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`   Found ${products.length} products\n`);

  const results = { updated: 0, skipped: 0, failed: 0, noImage: [] };

  for (let i = 0; i < products.length; i++) {
    const { id, name, localName, imageUrl } = products[i];
    console.log(`[${i + 1}/${products.length}] ${name}${localName ? ` (${localName})` : ''}`);

    // Skip if already has a real image
    const localFile = path.join(OUTPUT_DIR, `${id}.jpg`);
    if (imageUrl && imageUrl !== DEFAULT_IMAGE && !imageUrl.includes('default')) {
      console.log(`   ✅  Already has imageUrl — skipping`);
      results.skipped++;
      continue;
    }
    if (existsSync(localFile)) {
      console.log(`   ✅  Local file exists — skipping`);
      results.skipped++;
      continue;
    }

    // Build search queries
    const nameParts = [name, localName].filter(Boolean).join(' ');
    const queries = [
      `${nameParts} product packaging`,
      `${name} India grocery product`,
      `${name} packet`,
    ];

    let imgUrl = null;

    // Try Open Food Facts first (best for packaged goods)
    console.log(`   🔍  Trying Open Food Facts…`);
    imgUrl = await searchOpenFoodFacts(name);
    if (imgUrl) console.log(`   ✓  Found on Open Food Facts`);

    // Try DuckDuckGo
    if (!imgUrl) {
      console.log(`   🔍  Trying DuckDuckGo…`);
      imgUrl = await searchDuckDuckGo(queries[0]);
      if (imgUrl) console.log(`   ✓  Found on DuckDuckGo`);
    }

    // Try Google CSE if configured
    if (!imgUrl && GOOGLE_CSE_CX && !GOOGLE_CSE_CX.includes('your_')) {
      console.log(`   🔍  Trying Google CSE…`);
      imgUrl = await searchGoogle(queries[0]);
      if (imgUrl) console.log(`   ✓  Found on Google CSE`);
    }

    if (!imgUrl) {
      console.log(`   ❌  No image found — using default`);
      results.noImage.push(name);
      await updateDoc(doc(db, 'products', id), { imageUrl: DEFAULT_IMAGE });
      results.failed++;
      await sleep(DELAY_MS);
      continue;
    }

    // Download
    console.log(`   ⬇️   ${imgUrl.slice(0, 80)}…`);
    const ok = await downloadImage(imgUrl, localFile);
    if (!ok) {
      console.log(`   ❌  Download failed — using default`);
      results.noImage.push(name);
      await updateDoc(doc(db, 'products', id), { imageUrl: DEFAULT_IMAGE });
      results.failed++;
      await sleep(DELAY_MS);
      continue;
    }

    const publicPath = `/products/${id}.jpg`;
    await updateDoc(doc(db, 'products', id), { imageUrl: publicPath });
    console.log(`   ✅  Saved → ${publicPath}`);
    results.updated++;

    await sleep(DELAY_MS);
  }

  console.log('\n══════════════════════════════════════');
  console.log('✅  Done!');
  console.log(`   Updated : ${results.updated}`);
  console.log(`   Skipped : ${results.skipped}`);
  console.log(`   Failed  : ${results.failed}`);
  if (results.noImage.length > 0) {
    console.log('\n⚠️  No image found for:');
    results.noImage.forEach(n => console.log(`   - ${n}`));
  }
  console.log('══════════════════════════════════════\n');
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
