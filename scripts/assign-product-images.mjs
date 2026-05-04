/**
 * ONE-TIME SCRIPT: Assign product images — saves external URLs directly to Firestore
 *
 * ✅ Works on Vercel, mobile, any device — no local files needed
 * ✅ Uses Google Custom Search API (your existing key works)
 * ✅ Skips products that already have a real imageUrl
 *
 * Setup (one time):
 *   1. Go to https://programmablesearchengine.google.com/
 *   2. Click "Add" → name it anything → set "Search the entire web"
 *   3. After creation → Edit → "Search features" → turn ON "Image search"
 *   4. Copy the "Search engine ID" and add to .env:
 *      GOOGLE_CSE_CX="your_cx_here"
 *
 * Usage:
 *   node scripts/assign-product-images.mjs
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { existsSync, readFileSync } from 'fs';
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

// ── Firebase ──────────────────────────────────────────────────────────────────
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

// ── Config ────────────────────────────────────────────────────────────────────
const DELAY_MS       = 300; // Google CSE allows 100 free queries/day, 10 QPS
const API_KEY        = process.env.GOOGLE_CSE_API_KEY || process.env.GOOGLE_VISION_API_KEY;
const CX             = process.env.GOOGLE_CSE_CX;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchSafe(url, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(t);
    return r;
  } catch { clearTimeout(t); return null; }
}

// ── Source 1: Open Food Facts (free, no key) ──────────────────────────────────
async function searchOpenFoodFacts(name) {
  const res = await fetchSafe(
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,image_front_url`
  );
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    const kw = name.split(' ')[0].toLowerCase();
    const hit = (data.products || []).find(p =>
      p.image_front_url && (p.product_name || '').toLowerCase().includes(kw)
    );
    return hit?.image_front_url || null;
  } catch { return null; }
}

// ── Source 2: Google Custom Search (uses your existing API key) ───────────────
async function searchGoogleCSE(query) {
  if (!API_KEY || !CX || CX.includes('your_')) return null;
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key',        API_KEY);
  url.searchParams.set('cx',         CX);
  url.searchParams.set('q',          query);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('num',        '5');
  url.searchParams.set('imgType',    'photo');
  url.searchParams.set('safe',       'active');
  const res = await fetchSafe(url.toString());
  if (!res?.ok) {
    const err = await res?.text();
    console.warn(`   ⚠️  CSE error: ${(err || '').slice(0, 100)}`);
    return null;
  }
  try {
    const data = await res.json();
    const items = (data.items || []).filter(i => {
      const l = (i.link || '').toLowerCase();
      return !l.endsWith('.svg') && !l.endsWith('.gif') && !l.endsWith('.webp');
    });
    return items[0]?.link || null;
  } catch { return null; }
}

// ── Source 3: Wikimedia Commons (free, reliable for common products) ──────────
async function searchWikimedia(name) {
  const res = await fetchSafe(
    `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name + ' product')}&srnamespace=6&format=json&srlimit=3`
  );
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    const hits = (data.query?.search || []);
    if (!hits.length) return null;
    const title = hits[0].title.replace('File:', '');
    const infoRes = await fetchSafe(
      `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`
    );
    if (!infoRes?.ok) return null;
    const info = await infoRes.json();
    const pages = Object.values(info.query?.pages || {});
    return pages[0]?.imageinfo?.[0]?.url || null;
  } catch { return null; }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!CX || CX.includes('your_')) {
    console.log('⚠️  GOOGLE_CSE_CX not set — will use Open Food Facts + Wikimedia only');
    console.log('   For better results, add GOOGLE_CSE_CX to .env');
    console.log('   Get it free at: https://programmablesearchengine.google.com/\n');
  }

  console.log('📦  Fetching all products from Firestore…');
  const snapshot = await getDocs(collection(db, 'products'));
  const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`   Found ${products.length} products\n`);

  const results = { updated: 0, skipped: 0, failed: 0, noImage: [] };

  for (let i = 0; i < products.length; i++) {
    const { id, name, localName, imageUrl } = products[i];
    console.log(`[${i + 1}/${products.length}] ${name}${localName ? ` (${localName})` : ''}`);

    // Skip if already has a real external URL
    if (imageUrl && imageUrl.startsWith('http') && !imageUrl.includes('default')) {
      console.log(`   ✅  Already has image — skipping`);
      results.skipped++;
      continue;
    }

    const combined = [name, localName].filter(Boolean).join(' ');
    let imgUrl = null;

    // 1. Open Food Facts
    imgUrl = await searchOpenFoodFacts(name);
    if (imgUrl) { console.log(`   ✓  Open Food Facts`); }

    // 2. Google CSE
    if (!imgUrl) {
      imgUrl = await searchGoogleCSE(`${combined} product packaging India`);
      if (imgUrl) { console.log(`   ✓  Google CSE`); }
    }

    // 3. Wikimedia
    if (!imgUrl) {
      imgUrl = await searchWikimedia(name);
      if (imgUrl) { console.log(`   ✓  Wikimedia`); }
    }

    if (!imgUrl) {
      console.log(`   ❌  No image found`);
      results.noImage.push(name);
      results.failed++;
      await sleep(DELAY_MS);
      continue;
    }

    // Save external URL directly to Firestore
    await updateDoc(doc(db, 'products', id), { imageUrl: imgUrl });
    console.log(`   ✅  ${imgUrl.slice(0, 72)}…`);
    results.updated++;
    await sleep(DELAY_MS);
  }

  console.log('\n══════════════════════════════════════');
  console.log(`✅  Updated : ${results.updated}`);
  console.log(`⏭️  Skipped : ${results.skipped}`);
  console.log(`❌  Failed  : ${results.failed}`);
  if (results.noImage.length > 0) {
    console.log('\n⚠️  No image found for:');
    results.noImage.forEach(n => console.log(`   - ${n}`));
  }
  console.log('══════════════════════════════════════\n');
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
