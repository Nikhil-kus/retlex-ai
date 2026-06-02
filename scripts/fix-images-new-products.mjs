/**
 * Finds images for the newly added products that have no imageUrl yet,
 * using Google CSE which works better for Indian local brands.
 * Targets only products added in this batch (by name match).
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
const CSE_KEY = process.env.GOOGLE_CSE_API_KEY;
const CSE_CX  = process.env.GOOGLE_CSE_CX;
const sleep   = ms => new Promise(r => setTimeout(r, ms));

// Product name → best search query mapping
const SEARCH_MAP = {
  'Durga No.1 Jeera':                    'Durga No.1 Jeera cumin seeds packet',
  'Export Quality Jeera 100% Pure':      'Export Quality jeera cumin seeds packet India',
  'Shuchi Chironji Boora':               'Shuchi chironji boora packet India orange',
  'Babuji Premium Red Chilli Powder':    'Babuji Spices Red Chilli Powder packet India',
  'Homelite Safety Matches 214 Sticks':  'Homelite safety matches box 214 sticks India',
  'Dev Gold Lal Mirchi Powder':          'Dev Gold lal mirchi powder packet India',
  'Harsh Spices Coriander Powder 500g':  'Harsh Spices coriander powder 500g packet',
  'Babuji Premium Coriander Powder':     'Babuji Spices coriander powder packet India',
  'Upadhyay Special Haldi Powder':       'Upadhyay haldi turmeric powder packet India',
  'Klassic Sortex Clean Till':           'Klassic Sortex Clean Till sesame seeds packet',
  'Soni Gold Arecanut Pieces':           'Soni Gold Arecanut supari pieces packet India',
  'Crownfield Bio Muesli Organic 500g':  'Crownfield Bio Muesli Organic Cereals Seeds 500g',
  'Pushp Brand Chilli Powder Patna Quality': 'Pushp Brand Chilli Powder Patna Quality packet',
  'Chia Seeds Khula':                    'chia seeds packet India 100g',
  'Neelam Achar Masala':                 'Neelam Achar Masala packet India green',
  'Afghan Gold Green Jeera':             'Afghan Gold green jeera cumin packet India',
  'Upadhyay Special Coriander Powder':   'Upadhyay coriander powder sachet India',
  'Bhagwandas 501 Haldi Powder':         'Bhagwandas 501 haldi turmeric powder packet India',
  'Kamal Kishor Tambaku':                'Kamal Kishor tambaku tobacco packet India',
  'Tata Sampann Vermicelli 200g':        'Tata Sampann Vermicelli 200g packet India',
  'Haldiram Achar Masala':               'Haldiram Achar Masala packet India teal',
  'Silver Star Citric Acid':             'Silver Star Citric Acid packet India green',
  'Sukhi Adrak Khula':                   'sukhi adrak dry ginger pieces bulk India',
  'Snello Rovagnati GranCotto':          'Snello Rovagnati GranCotto product Italy',
};

async function fetchSafe(url, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    clearTimeout(t);
    return r;
  } catch { clearTimeout(t); return null; }
}

async function searchGoogleCSE(query) {
  if (!CSE_KEY || !CSE_CX) return null;
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', CSE_KEY);
  url.searchParams.set('cx', CSE_CX);
  url.searchParams.set('q', query);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('num', '5');
  url.searchParams.set('imgType', 'photo');
  url.searchParams.set('imgSize', 'medium');
  const res = await fetchSafe(url.toString());
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    const items = (data.items || []).filter(i => {
      const l = (i.link || '').toLowerCase();
      return !l.endsWith('.svg') && !l.endsWith('.gif') && !l.includes('logo');
    });
    return items[0]?.link || null;
  } catch { return null; }
}

async function searchBing(query) {
  const res = await fetchSafe(
    `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`
  );
  if (!res?.ok) return null;
  try {
    const html = await res.text();
    const murls = [...html.matchAll(/"murl":"(https?:[^"]+\.(?:jpg|jpeg|png))"/gi)];
    for (const m of murls.slice(0, 10)) {
      const url = decodeURIComponent(m[1]);
      if (!url.includes('logo') && !url.includes('icon') && !url.includes('banner')) return url;
    }
  } catch {}
  return null;
}

async function main() {
  console.log('🔍 Fetching products without images from shop...\n');
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', SHOP_ID)));
  const noImage = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => !p.imageUrl && SEARCH_MAP[p.name]);

  console.log(`Found ${noImage.length} products needing images\n`);

  let updated = 0, failed = 0;

  for (let i = 0; i < noImage.length; i++) {
    const p = noImage[i];
    const searchQ = SEARCH_MAP[p.name];
    console.log(`[${i + 1}/${noImage.length}] ${p.name}`);

    let imgUrl = await searchGoogleCSE(searchQ);
    let source = 'GoogleCSE';

    if (!imgUrl) {
      imgUrl = await searchBing(searchQ);
      source = 'Bing';
    }

    if (imgUrl) {
      await updateDoc(doc(db, 'products', p.id), { imageUrl: imgUrl });
      console.log(`   ✅ [${source}] ${imgUrl.slice(0, 70)}…\n`);
      updated++;
    } else {
      console.log(`   ❌ No image found\n`);
      failed++;
    }

    await sleep(500);
  }

  console.log(`\n✅ Updated: ${updated}  ❌ Failed: ${failed}`);
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
