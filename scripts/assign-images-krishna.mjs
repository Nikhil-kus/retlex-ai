/**
 * assign-images-krishna.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Assigns product images ONLY to Shri Krishna Kirana shop products.
 * Uses the same proven approach as assign-product-images.mjs:
 *   1. Open Food Facts (best for packaged goods)
 *   2. Bing Image Search (direct murl extraction — full-res source URL)
 *   3. Google CSE (fallback)
 *
 * Bilingual queries: combines English name + Hindi localName for better results.
 * Bulk items get "carton wholesale" modifier for more relevant images.
 *
 * Run: node scripts/assign-images-krishna.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
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

const DELAY_MS = 600;
const CSE_KEY  = process.env.GOOGLE_CSE_API_KEY;
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
        'Accept': 'text/html,application/json,*/*',
      }
    });
    clearTimeout(t);
    return r;
  } catch { clearTimeout(t); return null; }
}

// ── Source 1: Open Food Facts ─────────────────────────────────────────────────
async function searchOpenFoodFacts(name) {
  // Strip size suffixes for better matching
  const cleanName = name.replace(/\s*\d+\s*(g|ml|kg|l|pcs?|pc|bags?|pack|sachet|jar|tin|box|tube)\b.*/i, '').trim();
  for (const base of ['https://world.openfoodfacts.org', 'https://in.openfoodfacts.org']) {
    const res = await fetchSafe(
      `${base}/cgi/search.pl?search_terms=${encodeURIComponent(cleanName)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,image_front_url`
    );
    if (!res?.ok) continue;
    try {
      const data = await res.json();
      const kw = cleanName.split(' ')[0].toLowerCase();
      const products = data.products || [];
      const hit = products.find(p => p.image_front_url && (p.product_name||'').toLowerCase().includes(kw))
                || products.find(p => p.image_front_url);
      if (hit?.image_front_url) return hit.image_front_url;
    } catch { continue; }
  }
  return null;
}

// ── Source 2: Bing Image Search (direct murl extraction) ─────────────────────
async function searchBing(query) {
  const res = await fetchSafe(
    `https://www.bing.com/images/search?q=${encodeURIComponent(query + ' product India packaging')}&form=HDRSC2&first=1`,
    12000
  );
  if (!res?.ok) return null;
  try {
    const html = await res.text();
    const murls = [...html.matchAll(/"murl":"(https?:[^"]+\.(?:jpg|jpeg|png))"/gi)];
    for (const m of murls.slice(0, 10)) {
      const url = decodeURIComponent(m[1]);
      if (!url.includes('logo') && !url.includes('icon') && !url.includes('banner') && !url.includes('ad')) {
        return url;
      }
    }
    return null;
  } catch { return null; }
}

// ── Source 3: Google CSE ──────────────────────────────────────────────────────
async function searchGoogleCSE(query) {
  if (!CSE_KEY || !CSE_CX) return null;
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', CSE_KEY);
  url.searchParams.set('cx', CSE_CX);
  url.searchParams.set('q', query);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('num', '5');
  url.searchParams.set('imgType', 'photo');
  const res = await fetchSafe(url.toString());
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    const items = (data.items || []).filter(i => {
      const l = (i.link || '').toLowerCase();
      return !l.endsWith('.svg') && !l.endsWith('.gif');
    });
    return items[0]?.link || null;
  } catch { return null; }
}

// ── Build search query ────────────────────────────────────────────────────────
function buildQuery(name, localName) {
  const isBulk = /bulk|carton|\d+\s*pcs/i.test(name);
  // Strip size from name for cleaner search
  const cleanName = name.replace(/\s*\d+\s*(g|ml|kg|l|pcs?|pc|bags?|pack|sachet|jar|tin|box|tube|micron)\b.*/i, '').trim();
  const parts = [cleanName];
  if (localName) parts.push(localName.split(' ')[0]); // first Hindi word
  if (isBulk) parts.push('wholesale carton');
  return parts.join(' ');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Finding Shri Krishna Kirana shop...');
  const shopsSnap = await getDocs(collection(db, 'shops'));
  let shopId = null;
  for (const d of shopsSnap.docs) {
    if ((d.data().name || '').toLowerCase().includes('krishna')) {
      shopId = d.id;
      console.log(`✅ Found: ${d.data().name} (${shopId})\n`);
      break;
    }
  }
  if (!shopId) { console.error('❌ Shop not found'); process.exit(1); }

  // Fetch only products WITHOUT images for this shop
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => !p.imageUrl || !p.imageUrl.startsWith('http'));

  console.log(`📦 Products needing images: ${products.length}\n`);

  const results = { updated: 0, skipped: 0, failed: 0, noImage: [] };

  for (let i = 0; i < products.length; i++) {
    const { id, name, localName } = products[i];
    console.log(`[${i + 1}/${products.length}] ${name}`);

    const searchQuery = buildQuery(name, localName);
    let imgUrl = null;
    let source = '';

    // 1. Open Food Facts
    imgUrl = await searchOpenFoodFacts(name);
    if (imgUrl) source = 'OFF';

    // 2. Bing (bilingual query)
    if (!imgUrl) {
      imgUrl = await searchBing(searchQuery);
      if (imgUrl) source = 'Bing';
    }

    // 3. Google CSE
    if (!imgUrl) {
      imgUrl = await searchGoogleCSE(`${searchQuery} product packaging`);
      if (imgUrl) source = 'CSE';
    }

    if (!imgUrl) {
      console.log(`   ❌ No image found`);
      results.noImage.push(name);
      results.failed++;
      await sleep(DELAY_MS);
      continue;
    }

    await updateDoc(doc(db, 'products', id), { imageUrl: imgUrl });
    console.log(`   ✅ [${source}] ${imgUrl.slice(0, 70)}…`);
    results.updated++;
    await sleep(DELAY_MS);
  }

  console.log('\n══════════════════════════════════════');
  console.log(`✅ Updated : ${results.updated}`);
  console.log(`❌ Failed  : ${results.failed}`);
  if (results.noImage.length > 0) {
    console.log('\n⚠️  No image found for:');
    results.noImage.slice(0, 20).forEach(n => console.log(`   - ${n}`));
    if (results.noImage.length > 20) console.log(`   ... and ${results.noImage.length - 20} more`);
  }
  console.log('══════════════════════════════════════\n');
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
