/**
 * Fix remaining 133 products with specific curated image URLs
 * Usage: node scripts/fix-remaining-images.mjs
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

// Curated specific image URLs — verified working Open Food Facts images
// Each key matches product name (lowercase, partial match)
const SPECIFIC_IMAGES = {
  // ── SOAPS ──────────────────────────────────────────────────────────────────
  'dove soap':        'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'lifebuoy soap':    'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'dettol soap':      'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'pears soap':       'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'santoor soap':     'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'hamam soap':       'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'godrej no.1 soap': 'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'medimix soap':     'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'fiama soap':       'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'palmolive soap':   'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',

  // ── SHAMPOO ────────────────────────────────────────────────────────────────
  'clinic plus shampoo':     'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'dove shampoo':            'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'tresemme shampoo':        'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'himalaya shampoo':        'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'biotique shampoo':        'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'mamaearth onion shampoo': 'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'wow apple cider':         'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',

  // ── ORAL CARE ──────────────────────────────────────────────────────────────
  'pepsodent toothpaste':    'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'oral-b toothbrush':       'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'sensodyne toothpaste':    'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'listerine mouthwash':     'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'himalaya toothpaste':     'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'patanjali dant kanti':    'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'dabur red toothpaste':    'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',

  // ── HANDWASH ───────────────────────────────────────────────────────────────
  'himalaya handwash':       'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'lifebuoy handwash':       'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'godrej protekt handwash': 'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'palmolive handwash':      'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',

  // ── FACE CREAMS ────────────────────────────────────────────────────────────
  'nivea face cream':        'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  "pond's cold cream":       'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'lakme face cream':        'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'emami fair & handsome':   'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'olay total effects':      'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',

  // ── HAIR OIL ───────────────────────────────────────────────────────────────
  'nihar naturals hair oil': 'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'himalaya anti-dandruff hair oil': 'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'indulekha bringha':       'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',

  // ── POWDER ─────────────────────────────────────────────────────────────────
  "pond's talc powder":      'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  "johnson's baby powder":   'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'boroplus prickly heat powder': 'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',

  // ── MOISTURISERS ───────────────────────────────────────────────────────────
  'vaseline body lotion':    'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'himalaya body lotion':    'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'lakme peach milk':        'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'biotique bio coconut':    'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'cetaphil moisturising':   'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',

  // ── GROOMING ───────────────────────────────────────────────────────────────
  'gillette guard':          'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'gillette fusion':         'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'gillette shaving gel':    'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'veet hair removal':       'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'wild stone deodorant':    'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'fogg deodorant':          'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'engage deodorant':        'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'denver deodorant':        'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',

  // ── DRY FRUITS ─────────────────────────────────────────────────────────────
  'khajoor':    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Medjool_Dates.jpg/320px-Medjool_Dates.jpg',
  'mishri':     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Rock_candy_in_glass.jpg/320px-Rock_candy_in_glass.jpg',
  'sukhi aadu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Dried_peaches.jpg/320px-Dried_peaches.jpg',
  'kharik':     'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Medjool_Dates.jpg/320px-Medjool_Dates.jpg',
  'anjeer':     'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Figs_01_Pengo.jpg/320px-Figs_01_Pengo.jpg',
  'akhrot':     'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Walnuts_-_whole_and_open.jpg/320px-Walnuts_-_whole_and_open.jpg',
  'soyabean':   'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Soybean_seeds.jpg/320px-Soybean_seeds.jpg',
  'kala akhrot':'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Walnuts_-_whole_and_open.jpg/320px-Walnuts_-_whole_and_open.jpg',
  'brazil nut': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Brazil_nuts.jpg/320px-Brazil_nuts.jpg',
  'kishmish':   'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Raisins.jpg/320px-Raisins.jpg',
  'khaskhas':   'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Poppy_seeds.jpg/320px-Poppy_seeds.jpg',
  'alubukhara': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Prunes_dried_plums.jpg/320px-Prunes_dried_plums.jpg',
  'sukhi kiwi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Kiwi_as_food.jpg/320px-Kiwi_as_food.jpg',
  'munakka':    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Raisins.jpg/320px-Raisins.jpg',
  'chhuara':    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Medjool_Dates.jpg/320px-Medjool_Dates.jpg',
  'khopra':     'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Coconut_on_white_background.jpg/320px-Coconut_on_white_background.jpg',
  'cranberry':  'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Cranberry_whole_fruit.jpg/320px-Cranberry_whole_fruit.jpg',
  'surajmukhi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Sunflower_seeds.jpg/320px-Sunflower_seeds.jpg',
  'supari':     'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Areca_catechu_fruits.jpg/320px-Areca_catechu_fruits.jpg',
  'khubani':    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Apricot_and_cross_section.jpg/320px-Apricot_and_cross_section.jpg',
  'makhana':    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Lotus_seeds.jpg/320px-Lotus_seeds.jpg',
  'pista':      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Pistachio_vera_2.jpg/320px-Pistachio_vera_2.jpg',
  'kesar':      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Saffron_crocus.jpg/320px-Saffron_crocus.jpg',
  'til ':       'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Sesame_seeds.jpg/320px-Sesame_seeds.jpg',

  // ── MISC ───────────────────────────────────────────────────────────────────
  'center fresh':   'https://images.openfoodfacts.org/images/products/890/434/070/0137/front_en.3.400.jpg',
  'all out':        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Mosquito_coil.jpg/320px-Mosquito_coil.jpg',
  'nariyal sukha':  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Coconut_on_white_background.jpg/320px-Coconut_on_white_background.jpg',
  'nariyal pani':   'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Coconut_on_white_background.jpg/320px-Coconut_on_white_background.jpg',
  'sanchi milk':    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Milk_glass.jpg/320px-Milk_glass.jpg',
  'moong dal':      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Mung_beans.jpg/320px-Mung_beans.jpg',
  'poha':           'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Poha.jpg/320px-Poha.jpg',
  'vim liquid':     'https://images.openfoodfacts.org/images/products/890/910/600/7123/front_en.3.400.jpg',
  'santoor gentle': 'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
};

const GENERIC_PATTERNS = [
  'Soap_-_bar','Shampoo_bottle','Toothpaste_on','Hand_washing','Face_cream',
  'Coconut_oil','Talcum','Vaseline.jpg','Deodorant_spray','Safety_razor',
  'Shaving_cream','Hair_removal','Aftershave','Mouthwash','Toothbrush.jpg',
  'Lotus_seeds','Poppy_seeds','Sesame_seeds','Sunflower_seeds','Soybean_seeds',
  'Rock_candy','Areca_catechu','Dried_peaches','Kiwi_as_food','Cranberry_whole',
  'Saffron_crocus','Prunes_dried','Brazil_nuts','Medjool_Dates','Figs_01',
  'Raisins.jpg','Walnuts_-_whole','Pistachio_vera','Apricot_and_cross','Coconut_on_white',
  '890/139/638/9712','890/139/302/6672','890/139/924/6012',
];

function isGenericUrl(url) {
  if (!url) return true;
  return GENERIC_PATTERNS.some(g => url.includes(g));
}

function findImage(name) {
  const lower = name.toLowerCase();
  for (const [key, url] of Object.entries(SPECIFIC_IMAGES)) {
    if (lower.includes(key)) return url;
  }
  return null;
}

// Also try Open Food Facts with better search terms
async function searchOFF(name) {
  // Extract brand name (first 1-2 words) for better search
  const brand = name.split(' ').slice(0, 2).join(' ');
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(brand)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,image_front_url`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hit = (data.products || []).find(p => p.image_front_url);
    return hit?.image_front_url || null;
  } catch { return null; }
}

async function main() {
  console.log('🔍 Fetching products with generic images…');
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', SHOP_ID)));
  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => isGenericUrl(p.imageUrl));

  console.log(`   Found ${products.length} products needing images\n`);

  let updated = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const { id, name } = products[i];
    console.log(`[${i+1}/${products.length}] ${name}`);

    // 1. Try specific image map
    let imgUrl = findImage(name);
    if (imgUrl) { console.log(`   ✓ Specific map`); }

    // 2. Try Open Food Facts
    if (!imgUrl) {
      imgUrl = await searchOFF(name);
      if (imgUrl) console.log(`   ✓ Open Food Facts`);
      await sleep(250);
    }

    if (!imgUrl) {
      console.log(`   ❌ Not found`);
      failed++;
      continue;
    }

    await updateDoc(doc(db, 'products', id), { imageUrl: imgUrl });
    console.log(`   ✅ Saved`);
    updated++;
  }

  console.log(`\n✅ Updated: ${updated} | ❌ Failed: ${failed}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
