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

async function fetchSafe(url, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    clearTimeout(t);
    return r;
  } catch { clearTimeout(t); return null; }
}

async function searchBing(query) {
  const queries = [`${query} product India`, `${query} buy online India`];
  for (const q of queries) {
    const res = await fetchSafe(`https://www.bing.com/images/search?q=${encodeURIComponent(q)}&form=HDRSC2&first=1&tsc=ImageHoverTitle`);
    if (!res?.ok) continue;
    try {
      const html = await res.text();
      const murls = [...html.matchAll(/"murl":"(https?:[^"]+\.(?:jpg|jpeg|png))"/gi)];
      for (const m of murls.slice(0, 12)) {
        const url = decodeURIComponent(m[1]);
        if (!url.includes('logo') && !url.includes('icon') && !url.includes('banner')
            && !url.includes('ad') && !url.includes('sprite')) {
          return url;
        }
      }
    } catch { continue; }
    await sleep(300);
  }
  return null;
}

function buildQuery(name, localName) {
  const clean = name.replace(/\s*[\(\[]?[\d.]+\s*(g|ml|kg|l|pcs?|pc|bags?|pack|sachet|jar|tin|box|tube|micron|₹\d+)[\)\]]?.*/i, '').trim();
  const parts = [clean];
  if (localName) {
    parts.push(localName.split(' ').slice(0, 2).join(' '));
  }
  return parts.join(' ');
}

async function checkUrl(url) {
  if (!url || !url.startsWith("http")) return false;
  if (url.includes("tse1.mm.bing.net") || url.includes("fmcghouse.com") || url.includes("roopsi.in") || url.includes("incidecoder") || url.includes("exportersindia")) {
    return false;
  }
  return true;
}

async function main() {
  const shopId = 'Yvgf5Us3pdNGHa0ljBGr';
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.category && (p.category.toLowerCase().includes("oral") || p.category.toLowerCase().includes("tea")));

  let updated = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const isGood = await checkUrl(p.imageUrl);
    if (isGood) continue;
    
    process.stdout.write(`[${i+1}/${products.length}] Fixing: ${p.name.slice(0, 45)}… `);
    const q = buildQuery(p.name, p.localName);
    const imgUrl = await searchBing(q);

    if (!imgUrl) {
      console.log('❌');
      failed++;
    } else {
      await updateDoc(doc(db, 'products', p.id), { imageUrl: imgUrl });
      console.log(`✅ ${imgUrl.slice(0, 55)}…`);
      updated++;
    }
    await sleep(800);
  }

  console.log(`\n✅ Updated: ${updated} | ❌ Failed: ${failed}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
