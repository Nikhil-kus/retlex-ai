/**
 * assign-images-krishna-bing.mjs
 * Second pass — uses ONLY Bing for products still missing images.
 * Run: node scripts/assign-images-krishna-bing.mjs
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
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchSafe(url, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    clearTimeout(t);
    return r;
  } catch { clearTimeout(t); return null; }
}

async function searchBing(query) {
  // Try multiple query variations
  const queries = [
    `${query} product India`,
    `${query} buy online India`,
    `${query} kirana store`,
  ];
  for (const q of queries) {
    const res = await fetchSafe(
      `https://www.bing.com/images/search?q=${encodeURIComponent(q)}&form=HDRSC2&first=1&tsc=ImageHoverTitle`
    );
    if (!res?.ok) continue;
    try {
      const html = await res.text();
      const murls = [...html.matchAll(/"murl":"(https?:[^"]+\.(?:jpg|jpeg|png))"/gi)];
      for (const m of murls.slice(0, 12)) {
        const url = decodeURIComponent(m[1]);
        if (!url.includes('logo') && !url.includes('icon') && !url.includes('banner')
            && !url.includes('ad') && !url.includes('sprite')) {
          return url;
        }
      }
    } catch { continue; }
    await sleep(300);
  }
  return null;
}

function buildQuery(name, localName) {
  // Remove size suffix for cleaner search
  const clean = name.replace(/\s*[\(\[]?[\d.]+\s*(g|ml|kg|l|pcs?|pc|bags?|pack|sachet|jar|tin|box|tube|micron|₹\d+)[\)\]]?.*/i, '').trim();
  const parts = [clean];
  if (localName) {
    const firstHindi = localName.split(' ').slice(0, 2).join(' ');
    parts.push(firstHindi);
  }
  return parts.join(' ');
}

async function main() {
  console.log('🔍 Finding shop...');
  const shopsSnap = await getDocs(collection(db, 'shops'));
  let shopId = null;
  for (const d of shopsSnap.docs) {
    if ((d.data().name || '').toLowerCase().includes('krishna')) {
      shopId = d.id;
      console.log(`✅ ${d.data().name}\n`);
      break;
    }
  }
  if (!shopId) { console.error('Shop not found'); process.exit(1); }

  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => !p.imageUrl || !p.imageUrl.startsWith('http'));

  console.log(`📦 Still missing images: ${products.length}\n`);

  let updated = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const { id, name, localName } = products[i];
    process.stdout.write(`[${i+1}/${products.length}] ${name.slice(0, 50)}… `);

    const q = buildQuery(name, localName);
    const imgUrl = await searchBing(q);

    if (!imgUrl) {
      console.log('❌');
      failed++;
    } else {
      await updateDoc(doc(db, 'products', id), { imageUrl: imgUrl });
      console.log(`✅ ${imgUrl.slice(0, 55)}…`);
      updated++;
    }
    await sleep(800);
  }

  console.log(`\n✅ Updated: ${updated} | ❌ Failed: ${failed}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
