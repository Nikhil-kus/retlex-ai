import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';
import https from 'https';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'products');
function ensureDir(dir) { if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); }

const newProducts = [
  { name: 'Kali Til', localName: 'काली तिल', price: 100, unit: 'kg', category: 'Spices & Seasonings' },
  { name: 'Maggi Masala', localName: 'मैगी मसाला', price: 5, unit: 'pkt', category: 'Spices & Seasonings' },
  { name: 'Kala Namak', localName: 'काला नमक', price: 20, unit: 'kg', category: 'Miscellaneous' }, // Putting it in Misc like Tata Salt
  { name: 'Moongfali', localName: 'मूंगफली', price: 120, unit: 'kg', category: 'Miscellaneous' },
  { name: 'Soyabean Bari', localName: 'सोयाबीन बरी', price: 80, unit: 'kg', category: 'Pulses & Dals' },
  { name: 'Chawal Aata', localName: 'चावल आटा', price: 40, unit: 'kg', category: 'Grains & Cereals' },
  { name: 'Acid Bottle 1L', localName: 'एसिड बोतल', price: 20, unit: 'bottle', category: 'Household Cleaning' },
  { name: 'Dr. Phenyl', localName: 'डॉ फिनाइल', price: 50, unit: 'bottle', category: 'Household Cleaning' },
  { name: 'Everest Hingraj', localName: 'एवरेस्ट हींग', price: 60, unit: 'pc', category: 'Spices & Seasonings' },
  { name: 'Parmal Packet', localName: 'परमल पैकेट', price: 45, unit: 'pkt', category: 'Snacks & Confectionery' },
  { name: 'Makka Poha', localName: 'मक्का पोहा', price: 60, unit: 'kg', category: 'Grains & Cereals' },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function fetchSafe(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch { clearTimeout(timer); return null; }
}

async function searchDuckDuckGo(query) {
  const initUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
  const initRes = await fetchSafe(initUrl, 10000);
  if (!initRes || !initRes.ok) return null;
  const html = await initRes.text();
  const vqdMatch = html.match(/vqd=['"]([^'"]+)['"]/);
  if (!vqdMatch) return null;
  const vqd = vqdMatch[1];

  const imgUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1&v7exp=a`;
  const imgRes = await fetchSafe(imgUrl, 10000);
  if (!imgRes || !imgRes.ok) return null;
  try {
    const data = await imgRes.json();
    const results = (data.results || []).filter(r => {
      const url = (r.image || '').toLowerCase();
      const title = (r.title || '').toLowerCase();
      if (url.endsWith('.svg') || url.endsWith('.gif')) return false;
      if (title.includes('logo') || title.includes('icon')) return false;
      if (url.includes('bigbasket') || url.includes('jiomart') || url.includes('amazon')) return false;
      return true;
    });
    return results[0]?.image || null;
  } catch { return null; }
}

async function downloadImage(imageUrl, destPath, depth = 0) {
  if (depth > 4) return false;
  return new Promise(resolve => {
    const proto = imageUrl.startsWith('https') ? https : http;
    try {
      const req = proto.get(imageUrl, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
        if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
          downloadImage(res.headers.location, destPath, depth + 1).then(resolve);
          return;
        }
        if (res.statusCode !== 200) { resolve(false); return; }
        const writer = createWriteStream(destPath);
        pipeline(res, writer).then(() => resolve(true)).catch(() => resolve(false));
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
    } catch { resolve(false); }
  });
}

(async () => {
  ensureDir(OUTPUT_DIR);
  console.log("Fetching all shops...");
  const shopsSnap = await getDocs(collection(db, 'shops'));
  const shopIds = shopsSnap.docs.map(d => d.id);
  
  const cache = {};

  for (const np of newProducts) {
    const clean = np.name.toLowerCase();
    let queryStr = `${clean} product packaging India`;
    if (clean.includes('kali til') || clean.includes('moongfali') || clean.includes('bari') || clean.includes('aata') || clean.includes('poha')) {
       queryStr = `${clean} grocery packet India`;
    }
    if (clean.includes('acid bottle')) {
       queryStr = `acid bottle for toilet cleaning 1L India`;
    }

    let imgUrl = await searchDuckDuckGo(queryStr);
    let downloadedPath = null;
    let localFileId = `newprod_${Date.now()}_${Math.floor(Math.random()*1000)}`;

    if (imgUrl) {
      console.log(`[${np.name}] ⬇️ Downloading ${imgUrl.slice(0, 30)}...`);
      const localFile = path.join(OUTPUT_DIR, `${localFileId}.jpg`);
      const success = await downloadImage(imgUrl, localFile);
      if (success) {
        downloadedPath = `/products/${localFileId}.jpg`;
      } else {
        console.log(`[${np.name}] ❌ Download failed`);
        downloadedPath = '/products/default.png';
      }
    } else {
      console.log(`[${np.name}] ❌ Not found via DDG`);
      downloadedPath = '/products/default.png';
    }

    cache[np.name] = downloadedPath;
    await sleep(500);
  }

  console.log("\nAdding products to Firestore...");
  let added = 0;
  
  for (const shopId of shopIds) {
    const existingSnap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
    const existingNames = new Set(existingSnap.docs.map(d => d.data().name.toLowerCase()));

    for (const np of newProducts) {
      if (!existingNames.has(np.name.toLowerCase())) {
        const prodData = {
          shopId,
          name: np.name,
          localName: np.localName,
          price: np.price,
          unit: np.unit,
          category: np.category,
          imageUrl: cache[np.name],
          inStock: true
        };
        const newRef = doc(collection(db, 'products'));
        await setDoc(newRef, prodData);
        added++;
        console.log(`Added ${np.name} to shop ${shopId} with ID ${newRef.id}`);
        
        // Also rename the file to match the new document ID for consistency, if it's the first time
        // Actually since we add to multiple shops, keeping the file name as `newprod_...` is fine and works.
      }
    }
  }

  console.log(`Added ${added} new products across all shops!`);
  process.exit(0);
})();
