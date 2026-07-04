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

async function getOpenFoodFactsImage(productName) {
  try {
    const q = encodeURIComponent(productName);
    const res = await fetch(`https://in.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.products && data.products.length > 0) {
      for (const p of data.products) {
        if (p.image_front_url) return p.image_front_url;
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

(async () => {
  console.log("Fetching live images from OpenFoodFacts (India)...");
  
  const shopsSnap = await getDocs(collection(db, 'shops'));
  const shopIds = shopsSnap.docs.map(d => d.id);
  
  let updated = 0;
  let failed = 0;
  
  for (const shopId of shopIds) {
    const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
    const products = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => p.category && (p.category.toLowerCase().includes("oral") || p.category.toLowerCase().includes("tea")));

    for (const p of products) {
      const cleanName = p.name.replace(/\s*(100g|200g|50g|25g|250g|500g|1kg|bags|sachet|pack|150g|80g|30g|45g|300g|75g)/gi, '').trim();
      let url = await getOpenFoodFactsImage(cleanName);
      
      if (!url) {
        // Fallback to placehold.co so it's GUARANTEED visible, and color coded
        const color = p.category.toLowerCase().includes("oral") ? "0066CC/FFFFFF" : "CC6600/FFFFFF";
        const short = encodeURIComponent(p.name.slice(0, 25));
        url = `https://placehold.co/400x400/${color}.png?text=${short}`;
      }
      
      console.log(`[${shopId}] ${p.name} -> ${url}`);
      await updateDoc(doc(db, 'products', p.id), { imageUrl: url });
      updated++;
      await sleep(200);
    }
  }

  console.log(`Updated ${updated} items.`);
  process.exit(0);
})();
