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

function getFlipkartImage(queryStr) {
  return new Promise((resolve) => {
    // Strip out package sizes for better search results
    const cleanQuery = queryStr.replace(/\s*(100g|200g|50g|25g|250g|500g|1kg|bags|sachet|pack|150g|80g|30g|45g|300g|75g)/gi, '').trim();
    const url = `https://www.flipkart.com/search?q=${encodeURIComponent(cleanQuery)}&otracker=search`;
    
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const matches = [...data.matchAll(/(https:\/\/rukminim[^"'\s]+\.(?:jpg|jpeg|png|webp))/gi)];
        
        // Filter out Flipkart's own UI elements, logos, and icons
        const filtered = matches.map(m => m[1]).filter(u => 
          !u.includes('/www/') && 
          !u.includes('logo') && 
          !u.includes('icon') && 
          !u.includes('fk-p-registry') && 
          !u.includes('/brand/')
        );

        if (filtered.length > 0) {
          // Find the best quality if possible
          const best = filtered.find(u => u.includes('/612/') || u.includes('/832/') || u.includes('/416/'));
          resolve(best ? best : filtered[0]);
        } else {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
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

  const uniqueNames = [...new Set(allProducts.map(p => p.name))];
  console.log(`Found ${allProducts.length} total products, ${uniqueNames.length} unique.`);

  const cache = {};

  for (let i = 0; i < uniqueNames.length; i++) {
    const name = uniqueNames[i];
    process.stdout.write(`[${i+1}/${uniqueNames.length}] ${name.slice(0,30)}... `);
    
    const url = await getFlipkartImage(name);
    if (url) {
      console.log(`✅ ${new URL(url).pathname.split('/').slice(-1)[0].slice(0, 20)}...`);
      cache[name] = url;
    } else {
      console.log(`❌ Not found`);
    }
    await sleep(2000); // 2 second delay to completely avoid anti-bot blocks
  }

  console.log("\nUpdating Firestore...");
  let updated = 0;
  for (const p of allProducts) {
    const newUrl = cache[p.name];
    // ONLY update if it actually got a new image, else keep whatever it had
    if (newUrl && p.imageUrl !== newUrl) {
      await updateDoc(doc(db, 'products', p.id), { imageUrl: newUrl });
      updated++;
    }
  }

  console.log(`Updated ${updated} items with exact real product images from Flipkart!`);
  process.exit(0);
})();
