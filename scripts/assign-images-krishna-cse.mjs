/**
 * assign-images-krishna-cse.mjs
 * Third pass — uses Google Custom Search API for remaining products.
 * Run: node scripts/assign-images-krishna-cse.mjs
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

const CSE_KEY = process.env.GOOGLE_CSE_API_KEY;
const CSE_CX  = process.env.GOOGLE_CSE_CX;

async function searchCSE(query) {
  if (!CSE_KEY || !CSE_CX) return null;
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', CSE_KEY);
  url.searchParams.set('cx', CSE_CX);
  url.searchParams.set('q', `${query} product India`);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('num', '5');
  url.searchParams.set('imgType', 'photo');
  url.searchParams.set('imgSize', 'medium');
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const items = (data.items || []).filter(i => {
      const l = (i.link || '').toLowerCase();
      return !l.endsWith('.svg') && !l.endsWith('.gif') && !l.includes('logo');
    });
    return items[0]?.link || null;
  } catch { return null; }
}

function cleanName(name) {
  return name.replace(/\s*[\(\[]?[\d.]+\s*(g|ml|kg|l|pcs?|pc|bags?|pack|sachet|jar|tin|box|tube|micron|₹\d+)[\)\]]?.*/i, '').trim();
}

async function main() {
  console.log(`CSE Key: ${CSE_KEY ? CSE_KEY.slice(0,8)+'...' : 'MISSING'}`);
  console.log(`CSE CX:  ${CSE_CX || 'MISSING'}\n`);

  if (!CSE_KEY || !CSE_CX) {
    console.error('❌ Google CSE credentials not found in .env');
    process.exit(1);
  }

  const shopsSnap = await getDocs(collection(db, 'shops'));
  let shopId = null;
  for (const d of shopsSnap.docs) {
    if ((d.data().name || '').toLowerCase().includes('krishna')) {
      shopId = d.id; break;
    }
  }
  if (!shopId) { console.error('Shop not found'); process.exit(1); }

  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => !p.imageUrl || !p.imageUrl.startsWith('http'));

  console.log(`📦 Products needing images: ${products.length}\n`);

  let updated = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const { id, name, localName } = products[i];
    const q = cleanName(name) + (localName ? ' ' + localName.split(' ')[0] : '');
    process.stdout.write(`[${i+1}/${products.length}] ${name.slice(0,45)}… `);

    const imgUrl = await searchCSE(q);
    if (!imgUrl) {
      console.log('❌');
      failed++;
    } else {
      await updateDoc(doc(db, 'products', id), { imageUrl: imgUrl });
      console.log(`✅ ${imgUrl.slice(0, 55)}…`);
      updated++;
    }
    await sleep(200); // CSE allows ~10 req/sec
  }

  console.log(`\n✅ Updated: ${updated} | ❌ Failed: ${failed}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
