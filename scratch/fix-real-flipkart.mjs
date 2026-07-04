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
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchSafe(url, ms = 5000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    clearTimeout(t);
    return r;
  } catch { clearTimeout(t); return null; }
}

async function searchFlipkart(query) {
  // Strip out package sizes for better search results
  const cleanQuery = query.replace(/\s*(100g|200g|50g|25g|250g|500g|1kg|bags|sachet|pack|150g|80g|30g|45g|300g|75g)/gi, '').trim();
  const res = await fetchSafe(`https://www.flipkart.com/search?q=${encodeURIComponent(cleanQuery)}&otracker=search`);
  if (!res?.ok) return null;
  try {
    const html = await res.text();
    const matches = [...html.matchAll(/(https:\/\/rukminim[^"'\s]+\.(?:jpg|jpeg|png|webp))/gi)];
    if (matches.length > 0) {
      // Find the highest quality image available (usually contains 612 or 832)
      const good = matches.find(m => m[0].includes('/612/') || m[0].includes('/832/') || m[0].includes('/416/'));
      return good ? good[0] : matches[0][0];
    }
  } catch {}
  return null;
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

  // Deduplicate by name to save network requests
  const uniqueNames = [...new Set(allProducts.map(p => p.name))];
  console.log(`Found ${allProducts.length} total products, ${uniqueNames.length} unique.`);

  const cache = {};

  for (let i = 0; i < uniqueNames.length; i++) {
    const name = uniqueNames[i];
    process.stdout.write(`[${i+1}/${uniqueNames.length}] ${name.slice(0,30)}... `);
    
    const url = await searchFlipkart(name);
    if (url) {
      console.log(`✅ ${new URL(url).hostname}`);
      cache[name] = url;
    } else {
      console.log(`❌ Not found`);
    }
    await sleep(400); // polite delay
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

  console.log(`Updated ${updated} items with exact real images from Flipkart!`);
  process.exit(0);
})();
