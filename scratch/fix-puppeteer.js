const puppeteer = require('puppeteer');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, query, where } = require('firebase/firestore');

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

async function checkUrl(url) {
  if (!url || !url.startsWith("http")) return false;
  if (url.includes("tse1.mm.bing.net") || url.includes("fmcghouse.com") || url.includes("roopsi.in") || url.includes("incidecoder") || url.includes("exportersindia")) {
    return false;
  }
  return true;
}

(async () => {
  const shopId = 'Yvgf5Us3pdNGHa0ljBGr';
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.category && (p.category.toLowerCase().includes("oral") || p.category.toLowerCase().includes("tea")));

  const badProducts = [];
  for (const p of products) {
    if (!(await checkUrl(p.imageUrl))) {
      badProducts.push(p);
    }
  }

  console.log(`Found ${badProducts.length} bad products. Starting puppeteer...`);
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

  let updated = 0;
  for (let i = 0; i < badProducts.length; i++) {
    const p = badProducts[i];
    const q = encodeURIComponent(`${p.name} ${p.localName || ''} product india transparent png`);
    console.log(`[${i+1}/${badProducts.length}] ${p.name}...`);
    try {
      await page.goto(`https://duckduckgo.com/?q=${q}&t=h_&iax=images&ia=images`, { waitUntil: 'networkidle2', timeout: 15000 });
      await page.waitForSelector('.tile--img__img', { timeout: 5000 });
      
      const src = await page.evaluate(() => {
        const img = document.querySelector('.tile--img__img');
        if (!img) return null;
        let s = img.src;
        if (s.startsWith('//')) s = 'https:' + s;
        return s;
      });

      if (src) {
        await updateDoc(doc(db, 'products', p.id), { imageUrl: src });
        console.log(` ✅ ${src}`);
        updated++;
      } else {
        console.log(` ❌ Not found`);
      }
    } catch (e) {
      console.log(` ❌ Failed to fetch page`);
    }
  }
  
  await browser.close();
  console.log(`Updated ${updated} products.`);
  process.exit(0);
})();
