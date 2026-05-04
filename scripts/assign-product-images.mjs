/**
 * ONE-TIME SCRIPT: Assign product images — saves external URLs to Firestore
 * Works on Vercel/mobile without any local files.
 *
 * Sources (in order):
 *   1. Open Food Facts (free, great for packaged goods)
 *   2. Bing Image Search (free, no key)
 *   3. Google CSE (if key+cx configured correctly)
 *
 * Usage: node scripts/assign-product-images.mjs
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

const DELAY_MS = 500;
const CSE_KEY  = process.env.GOOGLE_CSE_API_KEY || process.env.GOOGLE_VISION_API_KEY;
const CSE_CX   = process.env.GOOGLE_CSE_CX;
const sleep    = ms => new Promise(r => setTimeout(r, ms));

// ── Fetch helper ──────────────────────────────────────────────────────────────
async function fetchSafe(url, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/json,*/*',
      }
    });
    clearTimeout(t);
    return r;
  } catch { clearTimeout(t); return null; }
}

// ── Source 1: Open Food Facts ─────────────────────────────────────────────────
async function searchOpenFoodFacts(name) {
  for (const base of ['https://world.openfoodfacts.org', 'https://in.openfoodfacts.org']) {
    const res = await fetchSafe(
      `${base}/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,image_front_url`
    );
    if (!res?.ok) continue;
    try {
      const data = await res.json();
      const kw = name.split(' ')[0].toLowerCase();
      const products = data.products || [];
      // Prefer name match, fallback to first with image
      const hit = products.find(p => p.image_front_url && (p.product_name||'').toLowerCase().includes(kw))
                || products.find(p => p.image_front_url);
      if (hit?.image_front_url) return hit.image_front_url;
    } catch { continue; }
  }
  return null;
}

// ── Source 2: Bing Image Search (no key needed) ───────────────────────────────
async function searchBing(query) {
  const res = await fetchSafe(
    `https://www.bing.com/images/search?q=${encodeURIComponent(query + ' product India')}&form=HDRSC2&first=1`,
    12000
  );
  if (!res?.ok) return null;
  try {
    const html = await res.text();
    // Bing embeds image URLs as murl in JSON blobs
    const murls = [...html.matchAll(/"murl":"(https?:[^"]+\.(?:jpg|jpeg|png))"/gi)];
    for (const m of murls.slice(0, 8)) {
      const url = decodeURIComponent(m[1]);
      if (!url.includes('logo') && !url.includes('icon') && !url.includes('banner')) {
        return url;
      }
    }
    return null;
  } catch { return null; }
}

// ── Source 3: Google CSE ──────────────────────────────────────────────────────
async function searchGoogleCSE(query) {
  if (!CSE_KEY || !CSE_CX || CSE_CX.includes('your_')) return null;
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', CSE_KEY);
  url.searchParams.set('cx', CSE_CX);
  url.searchParams.set('q', query);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('num', '5');
  url.searchParams.set('imgType', 'photo');
  const res = await fetchSafe(url.toString());
  if (!res?.ok) {
    const err = await res?.text().catch(() => '');
    if (!err.includes('has not been used') && !err.includes('does not have')) {
      console.warn(`   ⚠️  CSE: ${err.slice(0, 80)}`);
    }
    return null;
  }
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
    let source = '';

    // 1. Open Food Facts
    imgUrl = await searchOpenFoodFacts(name);
    if (imgUrl) source = 'Open Food Facts';

    // 2. Bing
    if (!imgUrl) {
      imgUrl = await searchBing(combined);
      if (imgUrl) source = 'Bing';
    }

    // 3. Google CSE
    if (!imgUrl) {
      imgUrl = await searchGoogleCSE(`${combined} product packaging`);
      if (imgUrl) source = 'Google CSE';
    }

    if (!imgUrl) {
      console.log(`   ❌  No image found`);
      results.noImage.push(name);
      results.failed++;
      await sleep(DELAY_MS);
      continue;
    }

    await updateDoc(doc(db, 'products', id), { imageUrl: imgUrl });
    console.log(`   ✅  [${source}] ${imgUrl.slice(0, 65)}…`);
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
