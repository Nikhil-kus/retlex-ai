/**
 * ONE-TIME SCRIPT: Assign product images by saving external URLs directly to Firestore
 *
 * ✅ Works on Vercel, mobile, any device — no local files needed
 * ✅ No API key required (uses Open Food Facts + DuckDuckGo)
 * ✅ Skips products that already have a real imageUrl
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
const DELAY_MS = 900;
const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY || process.env.GOOGLE_VISION_API_KEY;
const GOOGLE_CSE_CX      = process.env.GOOGLE_CSE_CX;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Fetch helper ──────────────────────────────────────────────────────────────
async function fetchSafe(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ProductImageBot/1.0)' }
    });
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ── Validate that a URL actually serves an image ──────────────────────────────
async function isValidImageUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.endsWith('.svg') || lower.endsWith('.gif') || lower.endsWith('.webp')) return false;
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    const ct = res.headers.get('content-type') || '';
    return res.ok && ct.startsWith('image/');
  } catch {
    // HEAD not supported — assume valid if URL looks like an image
    return /\.(jpg|jpeg|png)(\?|$)/i.test(url);
  }
}

// ── Source 1: Open Food Facts ─────────────────────────────────────────────────
async function searchOpenFoodFacts(name) {
  const query = encodeURIComponent(name);
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,image_front_url,image_url`;
  const res = await fetchSafe(url, 12000);
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    const keyword = name.split(' ')[0].toLowerCase();
    const products = (data.products || []).filter(p =>
      (p.image_front_url || p.image_url) &&
      (p.product_name || '').toLowerCase().includes(keyword)
    );
    const imgUrl = products[0]?.image_front_url || products[0]?.image_url || null;
    if (imgUrl && await isValidImageUrl(imgUrl)) return imgUrl;
    return null;
  } catch { return null; }
}

// ── Source 2: DuckDuckGo ──────────────────────────────────────────────────────
async function searchDuckDuckGo(query) {
  const initRes = await fetchSafe(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`);
  if (!initRes?.ok) return null;
  const html = await initRes.text();
  const vqdMatch = html.match(/vqd=['"]([^'"]+)['"]/);
  if (!vqdMatch) return null;

  const imgRes = await fetchSafe(
    `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${vqdMatch[1]}&f=,,,,,&p=1&v7exp=a`
  );
  if (!imgRes?.ok) return null;
  try {
    const data = await imgRes.json();
    const results = (data.results || []).filter(r => {
      const u = (r.image || '').toLowerCase();
      const t = (r.title || '').toLowerCase();
      return !u.endsWith('.svg') && !u.endsWith('.gif') &&
             !t.includes('logo') && !t.includes('icon') &&
             (u.includes('.jpg') || u.includes('.jpeg') || u.includes('.png'));
    });
    for (const r of results.slice(0, 3)) {
      if (await isValidImageUrl(r.image)) return r.image;
    }
    return null;
  } catch { return null; }
}

// ── Source 3: Google CSE (optional) ──────────────────────────────────────────
async function searchGoogle(query) {
  if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_CX || GOOGLE_CSE_CX.includes('your_')) return null;
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', GOOGLE_CSE_API_KEY);
  url.searchParams.set('cx', GOOGLE_CSE_CX);
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
    for (const item of items.slice(0, 3)) {
      if (await isValidImageUrl(item.link)) return item.link;
    }
    return null;
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

    // Skip if already has a real external URL (not a local path or default)
    if (imageUrl &&
        !imageUrl.startsWith('/products/') &&
        !imageUrl.includes('default') &&
        imageUrl.startsWith('http')) {
      console.log(`   ✅  Already has external URL — skipping`);
      results.skipped++;
      continue;
    }

    // Build search queries
    const combined = [name, localName].filter(Boolean).join(' ');
    const queries = [
      `${combined} product packaging`,
      `${name} India grocery product`,
      `${name} packet`,
    ];

    let imgUrl = null;

    // 1. Open Food Facts
    console.log(`   🔍  Open Food Facts…`);
    imgUrl = await searchOpenFoodFacts(name);
    if (imgUrl) console.log(`   ✓  Found on Open Food Facts`);

    // 2. DuckDuckGo
    if (!imgUrl) {
      console.log(`   🔍  DuckDuckGo…`);
      imgUrl = await searchDuckDuckGo(queries[0]);
      if (imgUrl) console.log(`   ✓  Found on DuckDuckGo`);
    }

    // 3. Google CSE
    if (!imgUrl && GOOGLE_CSE_CX && !GOOGLE_CSE_CX.includes('your_')) {
      console.log(`   🔍  Google CSE…`);
      imgUrl = await searchGoogle(queries[0]);
      if (imgUrl) console.log(`   ✓  Found on Google CSE`);
    }

    if (!imgUrl) {
      console.log(`   ❌  No image found`);
      results.noImage.push(name);
      results.failed++;
      await sleep(DELAY_MS);
      continue;
    }

    // Save external URL directly to Firestore — works everywhere
    await updateDoc(doc(db, 'products', id), { imageUrl: imgUrl });
    console.log(`   ✅  Saved URL → ${imgUrl.slice(0, 70)}…`);
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
