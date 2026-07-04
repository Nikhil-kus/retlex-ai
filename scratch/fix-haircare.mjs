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
  let imgUrl = await searchDuckDuckGo("hair and care aloe vera oil green bottle");
  let downloadedPath = null;
  let localFileId = `newprod_${Date.now()}_${Math.floor(Math.random()*1000)}`;

  if (imgUrl) {
    console.log(`⬇️ Downloading ${imgUrl.slice(0, 30)}...`);
    const localFile = path.join(OUTPUT_DIR, `${localFileId}.jpg`);
    const success = await downloadImage(imgUrl, localFile);
    if (success) {
      downloadedPath = `/products/${localFileId}.jpg`;
    } else {
      console.log(`❌ Download failed, using fallback DDG result`);
      // Try again
      imgUrl = await searchDuckDuckGo("hair care aloe vera marico");
      if (imgUrl) {
          const success2 = await downloadImage(imgUrl, localFile);
          if (success2) downloadedPath = `/products/${localFileId}.jpg`;
      }
    }
  }
  
  if (!downloadedPath) {
      console.log("Failed again");
      process.exit(1);
  }

  console.log("Updating Firestore...");
  const shopsSnap = await getDocs(collection(db, 'shops'));
  for (const shop of shopsSnap.docs) {
    const pSnap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shop.id), where('name', '==', 'Hair Care Aloe Vera')));
    for (const p of pSnap.docs) {
        await updateDoc(doc(db, 'products', p.id), { imageUrl: downloadedPath });
        console.log("Updated", p.id);
    }
  }

  process.exit(0);
})();
