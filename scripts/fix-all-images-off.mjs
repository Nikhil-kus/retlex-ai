/**
 * Fix all products with generic/wrong images using Open Food Facts search
 * Usage: node scripts/fix-all-images-off.mjs
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
const SHOP_ID = 'NjGBnhsc25w4jb2q6Ol4';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// All generic/wrong image patterns to replace
const GENERIC_PATTERNS = [
  'Soap_-_bar', 'Shampoo_bottle', 'Toothpaste_on', 'Hand_washing',
  'Face_cream', 'Coconut_oil', 'Talcum', 'Vaseline.jpg', 'Deodorant_spray',
  'Safety_razor', 'Shaving_cream', 'Hair_removal', 'Aftershave', 'Mouthwash',
  'Toothbrush.jpg', 'Lotus_seeds', 'Poppy_seeds', 'Sesame_seeds', 'Sunflower_seeds',
  'Soybean_seeds', 'Rock_candy', 'Areca_catechu', 'Dried_peaches', 'Kiwi_as_food',
  'Cranberry_whole', 'Saffron_crocus', 'Prunes_dried', 'Brazil_nuts',
  'Medjool_Dates', 'Figs_01', 'Raisins.jpg', 'Walnuts_-_whole',
  'Pistachio_vera', 'Apricot_and_cross', 'Coconut_on_white',
  // Cycling OFF images used as generic
  '890/139/638/9712', '890/139/302/6672', '890/139/924/6012',
];

function isGenericUrl(url) {
  if (!url) return true;
  return GENERIC_PATTERNS.some(g => url.includes(g));
}

// Build smart search query from product name
function buildSearchQuery(name) {
  // Remove size info, keep brand + product type
  return name
    .replace(/\d+\s*(g|ml|l|kg|pc|pkt)\b/gi, '')
    .replace(/packet|khula|loose/gi, '')
    .trim();
}

// Search Open Food Facts
async function searchOFF(searchTerm) {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchTerm)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,image_front_url,brands`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(12000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    const products = data.products || [];
    // Prefer products where name matches search term
    const kw = searchTerm.split(' ')[0].toLowerCase();
    const hit = products.find(p => p.image_front_url && (p.product_name || '').toLowerCase().includes(kw))
              || products.find(p => p.image_front_url);
    return hit?.image_front_url || null;
  } catch { return null; }
}

async function main() {
  console.log('🔍 Fetching products with generic images…');
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', SHOP_ID)));
  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => isGenericUrl(p.imageUrl));

  console.log(`   Found ${products.length} products needing real images\n`);

  let updated = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const { id, name, category, localName } = products[i];
    console.log(`[${i+1}/${products.length}] ${name}`);

    const searchQuery = buildSearchQuery(name);
    console.log(`   🔍 "${searchQuery}"`);

    let imgUrl = await searchOFF(searchQuery);

    // If not found, try with localName (Hindi) or shorter query
    if (!imgUrl && localName) {
      const shortQuery = name.split(' ').slice(0, 2).join(' ');
      imgUrl = await searchOFF(shortQuery);
    }

    if (!imgUrl) {
      console.log(`   ❌ Not found`);
      failed++;
      await sleep(300);
      continue;
    }

    await updateDoc(doc(db, 'products', id), { imageUrl: imgUrl });
    console.log(`   ✅ ${imgUrl.slice(0, 70)}…`);
    updated++;
    await sleep(300);
  }

  console.log(`\n══════════════════════════════`);
  console.log(`✅ Updated: ${updated}`);
  console.log(`❌ Failed : ${failed}`);
  console.log(`══════════════════════════════\n`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
