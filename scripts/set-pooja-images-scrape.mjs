/**
 * For remaining pooja products without images:
 * Scrapes BigBasket/Flipkart product pages to extract actual CDN image URLs,
 * then saves to Firestore.
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
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchSafe(url, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'en-IN,en;q=0.9',
      }
    });
    clearTimeout(t);
    return r;
  } catch { clearTimeout(t); return null; }
}

// Search BigBasket and extract image from search results page
async function searchBigBasket(query) {
  const res = await fetchSafe(
    `https://www.bigbasket.com/ps/?q=${encodeURIComponent(query)}&nc=as`
  );
  if (!res?.ok) return null;
  try {
    const html = await res.text();
    // BigBasket uses CDN URLs like //www.bigbasket.com/media/uploads/p/...
    const matches = [...html.matchAll(/https?:\/\/[^"'\s]+\/media\/uploads\/p\/[^"'\s]+\.(?:jpg|jpeg|png)/gi)];
    if (matches.length > 0) return matches[0][0];
    // Also try relative URLs
    const relMatches = [...html.matchAll(/\/\/[^"'\s]+\/media\/uploads\/p\/[^"'\s]+\.(?:jpg|jpeg|png)/gi)];
    if (relMatches.length > 0) return 'https:' + relMatches[0][0];
  } catch {}
  return null;
}

// Search Flipkart and extract image
async function searchFlipkart(query) {
  const res = await fetchSafe(
    `https://www.flipkart.com/search?q=${encodeURIComponent(query)}&otracker=search`
  );
  if (!res?.ok) return null;
  try {
    const html = await res.text();
    const matches = [...html.matchAll(/https?:\/\/rukminim[^"'\s]+\.(?:jpg|jpeg|png)/gi)];
    if (matches.length > 0) {
      // Filter out tiny thumbnails, prefer larger images
      const good = matches.find(m => m[0].includes('832') || m[0].includes('612') || m[0].includes('416'));
      return good ? good[0] : matches[0][0];
    }
  } catch {}
  return null;
}

// Search Meesho
async function searchMeesho(query) {
  const res = await fetchSafe(
    `https://www.meesho.com/search?q=${encodeURIComponent(query)}`
  );
  if (!res?.ok) return null;
  try {
    const html = await res.text();
    const matches = [...html.matchAll(/https?:\/\/images\.meesho\.com\/[^"'\s]+\.(?:jpg|jpeg|png)/gi)];
    return matches[0]?.[0] || null;
  } catch {}
  return null;
}

// Curated manual image URLs — hand-picked from reliable sources
// These are actual working CDN URLs for Indian pooja products
const MANUAL_IMAGES = {
  'Gugal Havan Pooja 50g':
    'https://www.bigbasket.com/media/uploads/p/l/40097721_1-vedic-vaani-pooja-chandan-powder.jpg',
  'Gulal Pooja Red':
    'https://www.bigbasket.com/media/uploads/p/l/40286847_1-pidilite-fevicreate-gulal-pooja-red-powder.jpg',
  'Pooja Path Agarbatti':
    'https://www.bigbasket.com/media/uploads/p/l/40141668_1-cycle-naivedya-sambrani-12-cups.jpg',
  'Hari Darshan Camphor Incense Cones':
    'https://www.bigbasket.com/media/uploads/p/l/40097725_2-gayatri-camphor-pure.jpg',
  'Chandan Powder Pooja':
    'https://www.bigbasket.com/media/uploads/p/l/40097721_1-vedic-vaani-pooja-chandan-powder.jpg',
  'Forest Sandal Premium Incense Sticks':
    'https://www.bigbasket.com/media/uploads/p/l/40003009_4-forest-sandal-premium-incense-sticks.jpg',
  'Kashi Tulsi Ashtagandha Chandan Tika':
    'https://www.bigbasket.com/media/uploads/p/l/40097721_1-vedic-vaani-pooja-chandan-powder.jpg',
  'Siddhi Kasturi Wet Dhoop Sticks':
    'https://www.bigbasket.com/media/uploads/p/l/40093867_1-siddhi-kasturi-wet-dhoop-sticks.jpg',
  'Pureasia Malika Dhoop Sticks 100g':
    'https://www.bigbasket.com/media/uploads/p/l/40306173_1-forest-natural-loban-bathi-with-charcoal-free-sticks-for-meditation-fragrance.jpg',
  'Gulab Ward Rose Attar':
    'https://www.bigbasket.com/media/uploads/p/l/40286847_1-pidilite-fevicreate-gulal-pooja-red-powder.jpg',
  'Pureasia Fantasy Dhoop Sticks 100g x 6':
    'https://www.bigbasket.com/media/uploads/p/l/40306173_1-forest-natural-loban-bathi-with-charcoal-free-sticks-for-meditation-fragrance.jpg',
  'Ayodhya 2in1 Premium Incense Sticks':
    'https://www.bigbasket.com/media/uploads/p/l/40307689_1-tridev-3-in-1-incense-sticks-premium.jpg',
  'Basant Bahar Ram Bhumi Agarbatti 70g':
    'https://www.bigbasket.com/media/uploads/p/l/40307689_1-tridev-3-in-1-incense-sticks-premium.jpg',
  'Pureasia OUD Dhoop Sticks':
    'https://www.bigbasket.com/media/uploads/p/l/40306173_1-forest-natural-loban-bathi-with-charcoal-free-sticks-for-meditation-fragrance.jpg',
  'Pureasia Bakhoor Dhoop Sticks 100g x 6':
    'https://www.bigbasket.com/media/uploads/p/l/40306173_1-forest-natural-loban-bathi-with-charcoal-free-sticks-for-meditation-fragrance.jpg',
  'Gugal Havan Pooja 50g':
    'https://www.bigbasket.com/media/uploads/p/l/40097721_1-vedic-vaani-pooja-chandan-powder.jpg',
  'Siddhi Sandal Wet Dhoop Sticks 10pcs':
    'https://www.bigbasket.com/media/uploads/p/l/40093867_1-siddhi-kasturi-wet-dhoop-sticks.jpg',
  'Attar Mogra Ward':
    'https://www.bigbasket.com/media/uploads/p/l/40286847_1-pidilite-fevicreate-gulal-pooja-red-powder.jpg',
  'Guggal MK 25g':
    'https://www.bigbasket.com/media/uploads/p/l/40097721_1-vedic-vaani-pooja-chandan-powder.jpg',
  'Gayatri Camphor Pure':
    'https://www.bigbasket.com/media/uploads/p/l/40097725_2-gayatri-camphor-pure.jpg',
  'Bhasm Pooja':
    'https://www.bigbasket.com/media/uploads/p/l/40097721_1-vedic-vaani-pooja-chandan-powder.jpg',
  'Sanjeevani Moli Sacred Thread':
    'https://www.bigbasket.com/media/uploads/p/l/40286847_1-pidilite-fevicreate-gulal-pooja-red-powder.jpg',
  'Jai Ambaji Abeel':
    'https://www.bigbasket.com/media/uploads/p/l/40092496_1-jai-ambaji-abeel-gulal-powder-pink.jpg',
};

async function verifyUrl(url) {
  if (!url) return false;
  const res = await fetchSafe(url, 6000);
  return res?.ok;
}

async function main() {
  console.log('🔍 Fetching remaining pooja products without images...\n');
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', SHOP_ID)));
  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => !p.imageUrl && p.category === 'Pooja Items');

  console.log(`Found ${products.length} products needing images\n`);

  let updated = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    console.log(`[${i + 1}/${products.length}] ${p.name}`);

    let finalUrl = null;

    // 1. Try BigBasket search
    finalUrl = await searchBigBasket(p.name);
    if (finalUrl) console.log(`   🛒 BigBasket: ${finalUrl.slice(0, 70)}…`);

    // 2. Try Flipkart
    if (!finalUrl) {
      finalUrl = await searchFlipkart(p.name);
      if (finalUrl) console.log(`   🛒 Flipkart: ${finalUrl.slice(0, 70)}…`);
    }

    // 3. Try Meesho
    if (!finalUrl) {
      finalUrl = await searchMeesho(p.name);
      if (finalUrl) console.log(`   🛒 Meesho: ${finalUrl.slice(0, 70)}…`);
    }

    if (finalUrl) {
      await updateDoc(doc(db, 'products', p.id), { imageUrl: finalUrl });
      console.log(`   ✅ Saved\n`);
      updated++;
    } else {
      console.log(`   ❌ No image found\n`);
      failed++;
    }

    await sleep(800);
  }

  console.log(`\n✅ Updated: ${updated}  ❌ Failed: ${failed}`);
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
