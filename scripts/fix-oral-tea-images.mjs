import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk',
  authDomain: 'retlex-ai.firebaseapp.com',
  projectId: 'retlex-ai',
  storageBucket: 'retlex-ai.firebasestorage.app',
  messagingSenderId: '339712048398',
  appId: '1:339712048398:web:578ac498b0c942db7aab5f',
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SHOP_ID = 'Yvgf5Us3pdNGHa0ljBGr';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchSafe(url, ms = 5000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'en-IN,en;q=0.9',
      }
    });
    clearTimeout(t);
    return r;
  } catch { clearTimeout(t); return null; }
}

async function searchBigBasket(query) {
  const res = await fetchSafe(`https://www.bigbasket.com/ps/?q=${encodeURIComponent(query)}&nc=as`);
  if (!res?.ok) return null;
  try {
    const html = await res.text();
    const matches = [...html.matchAll(/https?:\/\/[^"'\s]+\/media\/uploads\/p\/[^"'\s]+\.(?:jpg|jpeg|png)/gi)];
    if (matches.length > 0) return matches[0][0];
    const relMatches = [...html.matchAll(/\/\/[^"'\s]+\/media\/uploads\/p\/[^"'\s]+\.(?:jpg|jpeg|png)/gi)];
    if (relMatches.length > 0) return 'https:' + relMatches[0][0];
  } catch {}
  return null;
}

async function searchFlipkart(query) {
  const res = await fetchSafe(`https://www.flipkart.com/search?q=${encodeURIComponent(query)}&otracker=search`);
  if (!res?.ok) return null;
  try {
    const html = await res.text();
    const matches = [...html.matchAll(/https?:\/\/rukminim[^"'\s]+\.(?:jpg|jpeg|png)/gi)];
    if (matches.length > 0) {
      const good = matches.find(m => m[0].includes('832') || m[0].includes('612') || m[0].includes('416'));
      return good ? good[0] : matches[0][0];
    }
  } catch {}
  return null;
}

async function searchAmazon(query) {
  // Amazon HTML is hard, maybe rely on BB/FK first.
  return null;
}

async function checkUrl(url) {
  if (!url || !url.startsWith("http")) return false;
  // If it's a known bad or hotlink-protected domain, return false immediately
  if (url.includes("tse1.mm.bing.net") || url.includes("fmcghouse.com") || url.includes("roopsi.in") || url.includes("incidecoder")) {
    return false;
  }
  // Allow known good domains without HEAD request to save time
  if (url.includes("bigbasket.com") || url.includes("openfoodfacts.org") || url.includes("amazon.com") || url.includes("media-amazon.com")) {
    return true;
  }
  return false; // For others, assume bad and replace
}

async function main() {
  console.log('🔍 Checking Oral Care and Tea & Coffee products...\n');
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', SHOP_ID)));
  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.category && (p.category.toLowerCase().includes("oral") || p.category.toLowerCase().includes("tea")));

  let updated = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const isGood = await checkUrl(p.imageUrl);
    
    if (isGood) continue; // skip good ones
    
    console.log(`[${i + 1}/${products.length}] Fixing: ${p.name} (Current URL: ${p.imageUrl})`);
    
    let finalUrl = await searchBigBasket(p.name);
    if (finalUrl) console.log(`   🛒 BigBasket: ${finalUrl.slice(0, 70)}…`);

    if (!finalUrl) {
      finalUrl = await searchFlipkart(p.name);
      if (finalUrl) console.log(`   🛒 Flipkart: ${finalUrl.slice(0, 70)}…`);
    }

    if (finalUrl) {
      await updateDoc(doc(db, 'products', p.id), { imageUrl: finalUrl });
      console.log(`   ✅ Saved\n`);
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
