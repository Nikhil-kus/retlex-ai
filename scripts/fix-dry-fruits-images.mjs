/**
 * Fix dry fruits images using reliable direct URLs
 * Usage: node scripts/fix-dry-fruits-images.mjs
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}

const firebaseConfig = {
  apiKey: 'AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk',
  authDomain: 'retlex-ai.firebaseapp.com',
  projectId: 'retlex-ai',
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Reliable Wikipedia/Wikimedia Commons images for each dry fruit
// These are stable, high-quality, free-to-use images
const IMAGE_MAP = {
  'badam':    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Sweet_almonds.jpg/320px-Sweet_almonds.jpg',
  'kaju':     'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Cashew_nut_and_shell_diagram.jpg/320px-Cashew_nut_and_shell_diagram.jpg',
  'kishmish': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Raisins.jpg/320px-Raisins.jpg',
  'akhrot':   'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Walnuts_-_whole_and_open.jpg/320px-Walnuts_-_whole_and_open.jpg',
  'pista':    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Pistachio_vera_2.jpg/320px-Pistachio_vera_2.jpg',
  'chhuara':  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Medjool_Dates.jpg/320px-Medjool_Dates.jpg',
  'anjeer':   'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Figs_01_Pengo.jpg/320px-Figs_01_Pengo.jpg',
  'makhana':  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Lotus_seeds.jpg/320px-Lotus_seeds.jpg',
  'munakka':  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Raisins.jpg/320px-Raisins.jpg',
  'khajoor':  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Medjool_Dates.jpg/320px-Medjool_Dates.jpg',
  'chilgoza': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Pine_nuts.jpg/320px-Pine_nuts.jpg',
  'kharik':   'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Medjool_Dates.jpg/320px-Medjool_Dates.jpg',
  'mix dry':  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Sweet_almonds.jpg/320px-Sweet_almonds.jpg',
};

// Better fallback — use Open Food Facts search
async function searchOFF(keyword) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(keyword)}&search_simple=1&action=process&json=1&page_size=3&fields=product_name,image_front_url`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hit = (data.products||[]).find(p => p.image_front_url);
    return hit?.image_front_url || null;
  } catch { return null; }
}

function getImageUrl(name) {
  const lower = name.toLowerCase();
  for (const [key, url] of Object.entries(IMAGE_MAP)) {
    if (lower.includes(key)) return url;
  }
  return null;
}

async function main() {
  console.log('🔍 Fetching dry fruits products…');
  const snap = await getDocs(query(collection(db, 'products'), where('category', '==', 'Dry Fruits')));
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`   Found ${products.length} dry fruit products\n`);

  let updated = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const { id, name } = products[i];
    console.log(`[${i+1}/${products.length}] ${name}`);

    // Try Open Food Facts first with English keyword
    const keyword = name.split(' ')[0].toLowerCase();
    let imgUrl = await searchOFF(keyword);
    if (imgUrl) {
      console.log(`   ✓ Open Food Facts`);
    } else {
      // Use reliable Wikipedia image
      imgUrl = getImageUrl(name);
      if (imgUrl) console.log(`   ✓ Wikipedia`);
    }

    if (!imgUrl) {
      console.log(`   ❌ No image`);
      failed++;
      continue;
    }

    await updateDoc(doc(db, 'products', id), { imageUrl: imgUrl });
    console.log(`   ✅ ${imgUrl.slice(0, 65)}…`);
    updated++;
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n✅ Updated: ${updated} | ❌ Failed: ${failed}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
