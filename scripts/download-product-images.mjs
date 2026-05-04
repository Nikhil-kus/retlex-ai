/**
 * ONE-TIME SCRIPT: Download and assign product images from Google Custom Search API
 *
 * Usage:
 *   node scripts/download-product-images.mjs
 *
 * Required env vars (add to .env):
 *   GOOGLE_CSE_API_KEY   — Google API key with Custom Search enabled
 *   GOOGLE_CSE_CX        — Custom Search Engine ID (cx)
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID etc. (already in .env)
 *
 * How to get GOOGLE_CSE_CX:
 *   1. Go to https://programmablesearchengine.google.com/
 *   2. Create a new search engine → set "Search the entire web"
 *   3. Enable "Image search" in settings
 *   4. Copy the "Search engine ID" (cx)
 *
 * How to get GOOGLE_CSE_API_KEY:
 *   1. Go to https://console.cloud.google.com/
 *   2. Enable "Custom Search API"
 *   3. Create an API key (or reuse GOOGLE_VISION_API_KEY project)
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

// ── Load .env manually (no dotenv dependency needed) ──────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

// ── Config ────────────────────────────────────────────────────────────────────
const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY || process.env.GOOGLE_VISION_API_KEY;
const GOOGLE_CSE_CX      = process.env.GOOGLE_CSE_CX;
const OUTPUT_DIR         = path.join(__dirname, '..', 'public', 'products');
const DEFAULT_IMAGE      = '/products/default.png';
const DELAY_MS           = 1200; // stay under 100 req/day free quota

if (!GOOGLE_CSE_API_KEY) {
  console.error('❌  GOOGLE_CSE_API_KEY (or GOOGLE_VISION_API_KEY) not set in .env');
  process.exit(1);
}
if (!GOOGLE_CSE_CX) {
  console.error('❌  GOOGLE_CSE_CX not set in .env');
  console.error('   Get it from https://programmablesearchengine.google.com/');
  process.exit(1);
}

// ── Firebase init ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || 'AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk',
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || 'retlex-ai.firebaseapp.com',
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || 'retlex-ai',
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || 'retlex-ai.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID|| '339712048398',
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || '1:339712048398:web:578ac498b0c942db7aab5f',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db  = getFirestore(app);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Sleep for ms milliseconds */
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Ensure output directory exists */
function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * Search Google Custom Search for a product image.
 * Returns the first image URL or null.
 */
async function searchImage(query) {
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key',        GOOGLE_CSE_API_KEY);
  url.searchParams.set('cx',         GOOGLE_CSE_CX);
  url.searchParams.set('q',          query);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('num',        '5');
  url.searchParams.set('imgType',    'photo');
  url.searchParams.set('imgSize',    'medium');
  // Prefer product packaging shots
  url.searchParams.set('rights',     'cc_publicdomain|cc_attribute|cc_sharealike');

  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.text();
    console.warn(`   ⚠️  Search API error (${res.status}): ${err.slice(0, 120)}`);
    return null;
  }

  const data = await res.json();
  const items = data.items || [];

  // Filter: skip logos, ads, SVGs
  const filtered = items.filter(item => {
    const link = (item.link || '').toLowerCase();
    const title = (item.title || '').toLowerCase();
    // Skip SVG and GIF
    if (link.endsWith('.svg') || link.endsWith('.gif')) return false;
    // Skip obvious logos/icons
    if (title.includes('logo') || title.includes('icon') || title.includes('banner')) return false;
    return true;
  });

  return filtered.length > 0 ? filtered[0].link : (items[0]?.link || null);
}

/**
 * Download an image from url to destPath.
 * Returns true on success, false on failure.
 */
async function downloadImage(imageUrl, destPath) {
  return new Promise(resolve => {
    const protocol = imageUrl.startsWith('https') ? https : http;
    const req = protocol.get(imageUrl, { timeout: 15000 }, res => {
      // Follow redirects (up to 3)
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        downloadImage(res.headers.location, destPath).then(resolve);
        return;
      }
      if (res.statusCode !== 200) {
        resolve(false);
        return;
      }
      const contentType = res.headers['content-type'] || '';
      if (!contentType.startsWith('image/')) {
        resolve(false);
        return;
      }
      const writer = createWriteStream(destPath);
      pipeline(res, writer)
        .then(() => resolve(true))
        .catch(() => resolve(false));
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
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
    const product = products[i];
    const { id, name, localName, imageUrl } = product;

    console.log(`[${i + 1}/${products.length}] ${name}`);

    // ── Skip if image already exists ──────────────────────────────────────────
    const localFile = path.join(OUTPUT_DIR, `${id}.jpg`);
    if (imageUrl && imageUrl !== DEFAULT_IMAGE) {
      // Already has a remote URL assigned — skip
      console.log(`   ✅  Already has imageUrl, skipping`);
      results.skipped++;
      continue;
    }
    if (existsSync(localFile)) {
      console.log(`   ✅  Local file already exists, skipping`);
      results.skipped++;
      continue;
    }

    // ── Build search query ────────────────────────────────────────────────────
    const parts = [name];
    if (localName && localName !== name) parts.push(localName);
    parts.push('product packaging India front view');
    const searchQuery = parts.join(' ');
    console.log(`   🔍  Searching: "${searchQuery}"`);

    // ── Search ────────────────────────────────────────────────────────────────
    let imgUrl = null;
    try {
      imgUrl = await searchImage(searchQuery);
    } catch (e) {
      console.warn(`   ⚠️  Search failed: ${e.message}`);
    }

    if (!imgUrl) {
      console.log(`   ❌  No image found — assigning default`);
      results.noImage.push(name);
      // Update DB with default
      await updateDoc(doc(db, 'products', id), { imageUrl: DEFAULT_IMAGE });
      results.failed++;
      await sleep(DELAY_MS);
      continue;
    }

    console.log(`   ⬇️   Downloading: ${imgUrl.slice(0, 80)}…`);

    // ── Download ──────────────────────────────────────────────────────────────
    const ok = await downloadImage(imgUrl, localFile);
    if (!ok) {
      console.log(`   ❌  Download failed — assigning default`);
      results.noImage.push(name);
      await updateDoc(doc(db, 'products', id), { imageUrl: DEFAULT_IMAGE });
      results.failed++;
      await sleep(DELAY_MS);
      continue;
    }

    // ── Update Firestore ──────────────────────────────────────────────────────
    const publicPath = `/products/${id}.jpg`;
    await updateDoc(doc(db, 'products', id), { imageUrl: publicPath });
    console.log(`   ✅  Saved → ${publicPath}`);
    results.updated++;

    await sleep(DELAY_MS);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════');
  console.log('✅  Done!');
  console.log(`   Updated : ${results.updated}`);
  console.log(`   Skipped : ${results.skipped}`);
  console.log(`   Failed  : ${results.failed}`);
  if (results.noImage.length > 0) {
    console.log('\n⚠️  Products with no image found:');
    results.noImage.forEach(n => console.log(`   - ${n}`));
  }
  console.log('══════════════════════════════════════\n');
  process.exit(0);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
