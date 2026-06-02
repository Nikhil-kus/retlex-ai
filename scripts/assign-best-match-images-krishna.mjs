/**
 * assign-best-match-images-krishna.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Finds and assigns high-quality images to Shri Krishna Kirana shop products.
 * Targets products without images or with generic placeholder images.
 * ─────────────────────────────────────────────────────────────────────────────
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

const GENERIC_PATTERNS = [
  '890/139/638/9712', '890/139/302/6672', '890/139/924/6012',
  '890/103/086/5169', '890/154/200/1246', '890/120/703/1717',
  'placeholder', 'no-image', 'default-product'
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchSafe(url, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(t);
    return r;
  } catch { clearTimeout(t); return null; }
}

function cleanProductName(name) {
  return name
    .replace(/\s*\d+\s*(g|ml|kg|l|pcs?|pc|bags?|pack|sachet|jar|tin|box|tube|micron|sachets)\b.*/i, '')
    .replace(/\(₹\d+\)/g, '')
    .replace(/bulk\s*\d+\s*pcs/i, '')
    .trim();
}

async function searchOFF(name) {
  const clean = cleanProductName(name);
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(clean)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,image_front_url`;
  const res = await fetchSafe(url);
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    const hit = (data.products || []).find(p => p.image_front_url);
    return hit?.image_front_url || null;
  } catch { return null; }
}

async function searchBing(query) {
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query + ' product India')}&form=HDRSC2&first=1`;
  const res = await fetchSafe(url);
  if (!res?.ok) return null;
  try {
    const html = await res.text();
    // Try both murl (json) and mediaurl (param)
    const mediaUrls = [...html.matchAll(/mediaurl=([^&"']+)/gi)].map(m => decodeURIComponent(m[1]));
    const murls = [...html.matchAll(/"murl":"(https?:[^"]+\.(?:jpg|jpeg|png))"/gi)].map(m => decodeURIComponent(m[1]));
    
    const candidates = [...mediaUrls, ...murls];
    for (const img of candidates) {
      if (img.startsWith('http') && !img.includes('logo') && !img.includes('banner') && !img.includes('ad')) return img;
    }
  } catch { return null; }
  return null;
}

// DuckDuckGo fallback (using the bing thumbnail trick)
async function searchThumbnail(query) {
    const encoded = encodeURIComponent(query + ' site:bigbasket.com OR site:amazon.in');
    return `https://tse1.mm.bing.net/th?q=${encoded}`;
}

async function main() {
  console.log('🔍 Fetching products for Shri Krishna Kirana...');
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', SHOP_ID)));
  const allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const targets = allProducts.filter(p => {
    if (!p.imageUrl) return true;
    if (GENERIC_PATTERNS.some(pat => p.imageUrl.includes(pat))) return true;
    return false;
  });

  console.log(`📦 Found ${targets.length} products needing best-match images.\n`);

  const results = { updated: 0, failed: 0, noMatch: [] };

  for (let i = 0; i < targets.length; i++) {
    const { id, name, localName } = targets[i];
    console.log(`[${i + 1}/${targets.length}] ${name} (${localName || ''})`);

    let imgUrl = await searchOFF(name);
    let source = 'OFF';

    if (!imgUrl) {
      const clean = cleanProductName(name);
      imgUrl = await searchBing(clean);
      source = 'Bing';
    }

    if (!imgUrl && localName) {
        imgUrl = await searchBing(localName);
        source = 'Bing-Local';
    }

    // Last resort: Bing Thumbnail (always returns something, but might be less "best")
    // We only use this if the above failed
    if (!imgUrl) {
        // imgUrl = await searchThumbnail(cleanProductName(name));
        // source = 'Thumbnail';
        // Actually, let's keep it as failed if no real image found, so the user can provide theirs.
    }

    if (imgUrl) {
      console.log(`   ✅ Found via ${source}: ${imgUrl.slice(0, 60)}...`);
      await updateDoc(doc(db, 'products', id), { 
        imageUrl: imgUrl,
        imageSource: source.toLowerCase(),
        lastUpdated: new Date().toISOString()
      });
      results.updated++;
    } else {
      console.log(`   ❌ No best match found.`);
      results.failed++;
      results.noMatch.push(name);
    }

    await sleep(1000); // Respectful delay
  }

  console.log('\n══════════════════════════════════════');
  console.log(`✅ Updated : ${results.updated}`);
  console.log(`❌ Failed  : ${results.failed}`);
  if (results.noMatch.length > 0) {
    console.log('\nProducts requiring manual images (total: ' + results.noMatch.length + '):');
    results.noMatch.forEach(n => console.log(`- ${n}`));
  }
  console.log('══════════════════════════════════════\n');
}

main().catch(console.error);
