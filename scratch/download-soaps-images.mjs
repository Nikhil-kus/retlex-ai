import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
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
const DEFAULT_IMAGE = '/products/default.png';

const sleep = ms => new Promise(r => setTimeout(r, ms));
function ensureDir(dir) { if (!existsSync(dir)) mkdirSync(dir, { recursive: true }); }

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
  
  const allProducts = [];
  for (const shopId of shopIds) {
    const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
    const products = snap.docs
      .map(d => ({ id: d.id, ...d.data(), shopId }))
      .filter(p => p.category && (
        p.category.toLowerCase().includes("personal") || 
        p.category.toLowerCase().includes("hygiene") || 
        p.category.toLowerCase().includes("soap")
      ));
    allProducts.push(...products);
  }

  // Deduplicate by name
  const uniqueNames = [...new Set(allProducts.map(p => p.name))];
  console.log(`Found ${allProducts.length} total products, ${uniqueNames.length} unique.`);

  const cache = {}; // maps name -> local public URL

  for (let i = 0; i < uniqueNames.length; i++) {
    const name = uniqueNames[i];
    process.stdout.write(`[${i+1}/${uniqueNames.length}] ${name.slice(0,30)}... `);
    
    const representativeProduct = allProducts.find(p => p.name === name);
    const id = representativeProduct.id;
    const localFile = path.join(OUTPUT_DIR, `${id}.jpg`);
    const publicPath = `/products/${id}.jpg`;
    
    // If it already exists on disk from a previous run, use it
    if (existsSync(localFile)) {
      console.log(`✅ Cached locally`);
      cache[name] = publicPath;
      continue;
    }

    const clean = name.replace(/\s*(100g|200g|50g|25g|250g|500g|1kg|bags|sachet|pack|150g|80g|30g|45g|300g|75g|500ml|1L|1l|2L|3L|bar|powder|liquid)/gi, '').trim();
    const queryStr = `${clean} product packaging India`;
    
    let imgUrl = await searchDuckDuckGo(queryStr);
    
    if (imgUrl) {
      console.log(`⬇️ Downloading ${imgUrl.slice(0, 30)}...`);
      const success = await downloadImage(imgUrl, localFile);
      if (success) {
        cache[name] = publicPath;
      } else {
        console.log(`❌ Download failed`);
      }
    } else {
      console.log(`❌ Not found via DDG`);
    }
    
    await sleep(600);
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

  console.log(`Updated ${updated} items with fully downloaded local exact matches!`);
  process.exit(0);
})();
