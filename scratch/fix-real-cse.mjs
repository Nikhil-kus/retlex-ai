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

const CSE_KEY = "AIzaSyBgeOwrkXCOxkNcHgVMCfe5cg11cxokNGw";
const CSE_CX = "f780646d1e2a645c0";

async function searchCSE(query) {
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', CSE_KEY);
  url.searchParams.set('cx', CSE_CX);
  url.searchParams.set('q', `${query} product india`);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('num', '5'); // get 5 results
  url.searchParams.set('imgType', 'photo');
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const items = (data.items || []).filter(i => {
      const l = (i.link || '').toLowerCase();
      // Only filter out SVG, GIF, generic things, bigbasket (which 301s)
      return !l.endsWith('.svg') && !l.endsWith('.gif') && !l.includes('logo') && !l.includes('bigbasket.com') && !l.includes('tse1.mm.bing.net');
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
  let cseQuotaExceeded = false;

  for (let i = 0; i < uniqueNames.length; i++) {
    const name = uniqueNames[i];
    process.stdout.write(`[${i+1}/${uniqueNames.length}] ${name.slice(0,30)}... `);
    
    if (cseQuotaExceeded) {
      console.log(`⏭️ Skipped (Quota Exceeded)`);
      continue;
    }

    const url = await searchCSE(name);
    if (url) {
      console.log(`✅ ${new URL(url).hostname}`);
      cache[name] = url;
    } else {
      console.log(`❌ Not found or Quota exceeded`);
      // If the first few fail, assume quota exceeded to save time
      if (i > 3 && Object.keys(cache).length === 0) {
          cseQuotaExceeded = true;
      }
    }
    await sleep(200);
  }

  console.log("\nUpdating Firestore...");
  let updated = 0;
  for (const p of allProducts) {
    const newUrl = cache[p.name];
    // ONLY UPDATE if we actually found a new URL. Leave placehold.co otherwise.
    if (newUrl && p.imageUrl !== newUrl) {
      await updateDoc(doc(db, 'products', p.id), { imageUrl: newUrl });
      updated++;
    }
  }

  console.log(`Updated ${updated} items with real images!`);
  process.exit(0);
})();
