import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import fs from 'fs';

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
const sleep = ms => new Promise(r => setTimeout(r, ms));

const CSE_KEY = "AIzaSyBgeOwrkXCOxkNcHgVMCfe5cg11cxokNGw";
const CSE_CX = "f780646d1e2a645c0";

async function fetchSafe(url, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } });
    clearTimeout(t);
    return r;
  } catch { clearTimeout(t); return null; }
}

async function getOpenFoodFacts(query) {
  const res = await fetchSafe(`https://in.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1`);
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    if (data.products && data.products.length > 0) {
      for (const p of data.products) {
        if (p.image_front_url) return p.image_front_url;
      }
    }
  } catch (e) {}
  return null;
}

async function searchCSE(query) {
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', CSE_KEY);
  url.searchParams.set('cx', CSE_CX);
  url.searchParams.set('q', `${query} product India`);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('num', '3');
  url.searchParams.set('imgType', 'photo');
  url.searchParams.set('imgSize', 'medium');
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const items = (data.items || []).filter(i => {
      const l = (i.link || '').toLowerCase();
      // Avoid bigbasket/amazon because they hotlink block
      return !l.includes("bigbasket") && !l.includes("amazon") && !l.includes("media-amazon") && !l.endsWith('.svg') && !l.includes('logo');
    });
    return items[0]?.link || null;
  } catch { return null; }
}

(async () => {
  console.log("Fetching all shops...");
  const shopsSnap = await getDocs(collection(db, 'shops'));
  const shopIds = shopsSnap.docs.map(d => d.id);
  
  const allProducts = [];
  for (const shopId of shopIds) {
    const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
    const products = snap.docs
      .map(d => ({ id: d.id, ...d.data(), shopId }))
      .filter(p => p.category && (p.category.toLowerCase().includes("oral") || p.category.toLowerCase().includes("tea")));
    allProducts.push(...products);
  }

  // Deduplicate by name
  const uniqueNames = [...new Set(allProducts.map(p => p.name))];
  console.log(`Found ${allProducts.length} total products, ${uniqueNames.length} unique.`);

  const cache = {};

  for (let i = 0; i < uniqueNames.length; i++) {
    const name = uniqueNames[i];
    process.stdout.write(`[${i+1}/${uniqueNames.length}] ${name.slice(0,30)}... `);
    
    let url = await getOpenFoodFacts(name.replace(/\s*(100g|200g|50g|25g|250g|500g|1kg|bags|sachet|pack|150g|80g|30g|45g|300g|75g)/gi, '').trim());
    if (url) {
      console.log(`✅ OpenFoodFacts`);
    } else {
      url = await searchCSE(name);
      if (url) {
        console.log(`✅ CSE (${new URL(url).hostname})`);
      } else {
        console.log(`❌ Not found`);
      }
    }
    
    if (url) {
      cache[name] = url;
    }
    await sleep(200);
  }

  console.log("\nUpdating Firestore...");
  let updated = 0;
  for (const p of allProducts) {
    const newUrl = cache[p.name];
    if (newUrl && p.imageUrl !== newUrl) {
      await updateDoc(doc(db, 'products', p.id), { imageUrl: newUrl });
      updated++;
    }
  }

  console.log(`Updated ${updated} items with real images!`);
  process.exit(0);
})();
