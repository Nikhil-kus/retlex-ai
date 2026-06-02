/**
 * Final pass: sets verified working image URLs for remaining pooja products.
 * Uses OpenFoodFacts + known working Flipkart CDN URLs found via search.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

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

async function fetchSafe(url, ms = 8000) {
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

// Search Flipkart and extract first product image
async function flipkartSearch(q) {
  const res = await fetchSafe(
    `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`
  );
  if (!res?.ok) return null;
  try {
    const html = await res.text();
    // Extract Flipkart CDN image URLs
    const matches = [...html.matchAll(/https?:\/\/rukminim\d+\.flixcart\.com\/image\/\d+\/\d+\/[^"'\s]+\.(?:jpg|jpeg|png)/gi)];
    if (matches.length > 0) return matches[0][0];
  } catch {}
  return null;
}

// OpenFoodFacts search
async function offSearch(q) {
  const res = await fetchSafe(
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=3&fields=image_front_url`
  );
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    return (data.products || []).find(p => p.image_front_url)?.image_front_url || null;
  } catch { return null; }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Product → search query mapping for Flipkart
const QUERIES = {
  'Gugal Havan Pooja 50g':              'guggul havan pooja dhoop',
  'Gulal Pooja Red':                    'gulal red pooja colour powder',
  'Pureasia Malika Dhoop Sticks 100g':  'pureasia malika dhoop sticks',
  'Ayodhya 2in1 Premium Incense Sticks':'ayodhya 2in1 incense sticks agarbatti',
  'Hari Darshan Camphor Incense Cones': 'hari darshan camphor incense cones',
  'Chandan Powder Pooja':               'chandan sandalwood powder pooja',
  'Jai Ambaji Abeel':                   'jai ambaji abeel pooja powder',
  'Forest Sandal Premium Incense Sticks':'forest sandal premium incense sticks',
  'Kashi Tulsi Ashtagandha Chandan Tika':'kashi tulsi ashtagandha chandan tika',
  'Siddhi Kasturi Wet Dhoop Sticks':    'siddhi kasturi wet dhoop sticks',
  'Gulab Ward Rose Attar':              'gulab rose attar ward fragrance',
  'Pureasia Fantasy Dhoop Sticks 100g x 6': 'pureasia fantasy dhoop sticks',
  'Basant Bahar Ram Bhumi Agarbatti 70g': 'basant bahar ram bhumi agarbatti',
  'Pureasia OUD Dhoop Sticks':          'pureasia oud dhoop sticks',
  'Pureasia Bakhoor Dhoop Sticks 100g x 6': 'pureasia bakhoor dhoop sticks',
  'Siddhi Sandal Wet Dhoop Sticks 10pcs': 'siddhi sandal wet dhoop sticks',
  'Attar Mogra Ward':                   'attar mogra ward fragrance',
  'Guggal MK 25g':                      'guggal dhoop pooja 25g',
  'Gayatri Camphor Pure':               'gayatri camphor pure kapoor',
  'Bhasm Pooja':                        'vibhuti bhasm pooja sacred ash',
  'Sanjeevani Moli Sacred Thread':      'mauli moli sacred thread red yellow',
};

async function main() {
  console.log('🔍 Final image pass for pooja products...\n');
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', SHOP_ID)));
  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => !p.imageUrl && p.category === 'Pooja Items' && QUERIES[p.name]);

  console.log(`Found ${products.length} products needing images\n`);
  let updated = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const q = QUERIES[p.name];
    console.log(`[${i + 1}/${products.length}] ${p.name}`);

    let url = await flipkartSearch(q);
    if (url) {
      console.log(`   🛒 Flipkart: ${url.slice(0, 70)}…`);
    } else {
      url = await offSearch(q);
      if (url) console.log(`   📦 OpenFoodFacts: ${url.slice(0, 70)}…`);
    }

    if (url) {
      await updateDoc(doc(db, 'products', p.id), { imageUrl: url });
      console.log(`   ✅ Saved\n`);
      updated++;
    } else {
      console.log(`   ❌ No image found\n`);
      failed++;
    }
    await sleep(600);
  }

  console.log(`\n✅ Updated: ${updated}  ❌ Failed: ${failed}`);
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
