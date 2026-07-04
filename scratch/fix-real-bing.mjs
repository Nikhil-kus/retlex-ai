import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import https from 'https';

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

function fetchSafe(url, ms = 15000) {
  return new Promise((resolve) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => { ctrl.abort(); resolve(null); }, ms);
    fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    })
    .then(r => { clearTimeout(t); resolve(r); })
    .catch(() => { clearTimeout(t); resolve(null); });
  });
}

async function searchBing(queryStr) {
  const clean = queryStr.replace(/\s*(100g|200g|50g|25g|250g|500g|1kg|bags|sachet|pack|150g|80g|30g|45g|300g|75g)/gi, '').trim();
  const queries = [
    `${clean} product India`,
    `${clean} grocery`,
    `${clean} kirana`
  ];
  
  for (const q of queries) {
    const res = await fetchSafe(
      `https://www.bing.com/images/search?q=${encodeURIComponent(q)}&form=HDRSC2&first=1&tsc=ImageHoverTitle`
    );
    if (!res?.ok) continue;
    try {
      const html = await res.text();
      const murls = [...html.matchAll(/"murl":"(https?:[^"]+\.(?:jpg|jpeg|png))"/gi)];
      for (const m of murls.slice(0, 15)) {
        const url = decodeURIComponent(m[1]).toLowerCase();
        // Skip known hotlink blockers and generic logos
        if (!url.includes('logo') && !url.includes('icon') && !url.includes('banner') &&
            !url.includes('ad') && !url.includes('sprite') &&
            !url.includes('amazon') && !url.includes('bigbasket') && !url.includes('jiomart') &&
            !url.includes('flipkart') && !url.includes('flixcart')) {
          return decodeURIComponent(m[1]); // return original case
        }
      }
    } catch {}
    await sleep(400);
  }
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

  // Deduplicate by name
  const uniqueNames = [...new Set(allProducts.map(p => p.name))];
  console.log(`Found ${allProducts.length} total products, ${uniqueNames.length} unique.`);

  const cache = {};

  for (let i = 0; i < uniqueNames.length; i++) {
    const name = uniqueNames[i];
    process.stdout.write(`[${i+1}/${uniqueNames.length}] ${name.slice(0,30)}... `);
    
    const url = await searchBing(name);
    if (url) {
      console.log(`✅ ${new URL(url).hostname}`);
      cache[name] = url;
    } else {
      console.log(`❌ Not found`);
    }
    await sleep(600); // polite delay
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

  console.log(`Updated ${updated} items with exact real images from Bing!`);
  process.exit(0);
})();
