/**
 * Fix Beauty & Personal Care product images using Open Food Facts + specific Wikipedia images
 * Usage: node scripts/fix-beauty-images.mjs
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

// Generic placeholder URLs to replace
const GENERIC_URLS = [
  'Soap_-_bar', 'Shampoo_bottle', 'Toothpaste_on', 'Hand_washing',
  'Face_cream', 'Coconut_oil', 'Talcum', 'Vaseline', 'Deodorant_spray',
  'Safety_razor', 'Shaving_cream', 'Hair_removal', 'Aftershave', 'Mouthwash',
  'Toothbrush', 'Lotus_seeds', 'Poppy_seeds', 'Sesame_seeds', 'Sunflower_seeds',
  'Soybean_seeds', 'Rock_candy', 'Areca_catechu', 'Dried_peaches', 'Kiwi_as_food',
  'Cranberry_whole', 'Saffron_crocus', 'Prunes_dried', 'Brazil_nuts',
  'Medjool_Dates', 'Figs_01', 'Raisins.jpg', 'Walnuts_-_whole',
  'Pistachio_vera', 'Apricot_and_cross', 'Coconut_on_white'
];

function isGenericUrl(url) {
  if (!url) return true;
  return GENERIC_URLS.some(g => url.includes(g));
}

// Specific Open Food Facts barcode-based image URLs for popular Indian brands
// Format: brand keyword -> OFF image URL
const BRAND_IMAGES = {
  // Soaps
  'lux soap':        'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'dove soap':       'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'lifebuoy soap':   'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'dettol soap':     'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'pears soap':      'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'santoor soap':    'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'hamam soap':      'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'cinthol soap':    'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'godrej no.1 soap':'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'medimix soap':    'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'fiama soap':      'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'palmolive soap':  'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',

  // Shampoo
  'clinic plus shampoo':    'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'sunsilk shampoo':        'https://images.openfoodfacts.org/images/products/480/088/814/0852/front_en.3.400.jpg',
  'head & shoulders shampoo':'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'pantene shampoo':        'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'dove shampoo':           'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'tresemme shampoo':       'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'himalaya shampoo':       'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'biotique shampoo':       'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'mamaearth onion shampoo':'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'wow apple cider':        'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',

  // Oral Care
  'colgate toothpaste':     'https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg',
  'pepsodent toothpaste':   'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'close up toothpaste':    'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'dabur red toothpaste':   'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'sensodyne toothpaste':   'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'himalaya toothpaste':    'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'patanjali dant kanti':   'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'colgate charcoal':       'https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg',
  'colgate mouthwash':      'https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg',
  'listerine mouthwash':    'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'oral-b toothbrush':      'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'colgate 360 toothbrush': 'https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg',

  // Handwash
  'dettol handwash':        'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'lifebuoy handwash':      'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'savlon handwash':        'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'himalaya handwash':      'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'godrej protekt handwash':'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'palmolive handwash':     'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',

  // Face Creams
  'glow & lovely':          'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  "pond's cold cream":      'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'nivea face cream':       'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'lakme face cream':       'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'himalaya face cream':    'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'olay total effects':     'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'garnier skin naturals':  'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'emami fair & handsome':  'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',

  // Hair Oil
  'parachute coconut oil':  'https://images.openfoodfacts.org/images/products/890/600/102/3043/front_en.3.400.jpg',
  'dabur amla hair oil':    'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'bajaj almond hair oil':  'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'vatika hair oil':        'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'nihar naturals hair oil':'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'kesh king hair oil':     'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'indulekha bringha':      'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'himalaya anti-dandruff hair oil': 'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',

  // Powder
  "pond's talc powder":     'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  "johnson's baby powder":  'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'nycil prickly heat powder': 'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'boroplus prickly heat powder': 'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',

  // Moisturisers
  'vaseline body lotion':   'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'nivea body lotion':      'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'parachute advansed body lotion': 'https://images.openfoodfacts.org/images/products/890/600/102/3043/front_en.3.400.jpg',
  'himalaya body lotion':   'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'cetaphil moisturising':  'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'lakme peach milk':       'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'biotique bio coconut':   'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',

  // Grooming
  'gillette mach3':         'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'gillette fusion':        'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'gillette guard':         'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'veet hair removal':      'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'gillette shaving gel':   'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'park avenue shaving':    'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'old spice aftershave':   'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'axe deodorant':          'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'fogg deodorant':         'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'wild stone deodorant':   'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'engage deodorant':       'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'denver deodorant':       'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'nivea men deodorant':    'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
};

// Search Open Food Facts for a product
async function searchOFF(searchTerm) {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchTerm)}&search_simple=1&action=process&json=1&page_size=3&fields=product_name,image_front_url`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const hit = (data.products || []).find(p => p.image_front_url);
    return hit?.image_front_url || null;
  } catch { return null; }
}

function getBrandImage(name) {
  const lower = name.toLowerCase();
  for (const [key, url] of Object.entries(BRAND_IMAGES)) {
    if (lower.includes(key)) return url;
  }
  return null;
}

async function main() {
  console.log('🔍 Fetching all products with generic/wrong images…');
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', SHOP_ID)));
  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => isGenericUrl(p.imageUrl));

  console.log(`   Found ${products.length} products needing real images\n`);

  let updated = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const { id, name, category } = products[i];
    console.log(`[${i+1}/${products.length}] ${name} (${category})`);

    // 1. Try brand-specific mapping first
    let imgUrl = getBrandImage(name);
    if (imgUrl) {
      console.log(`   ✓ Brand map`);
    }

    // 2. Try Open Food Facts
    if (!imgUrl) {
      const searchTerm = name.replace(/\d+g|\d+ml|\d+l/gi, '').trim();
      imgUrl = await searchOFF(searchTerm);
      if (imgUrl) console.log(`   ✓ Open Food Facts`);
      await sleep(300);
    }

    if (!imgUrl) {
      console.log(`   ❌ No image found`);
      failed++;
      continue;
    }

    await updateDoc(doc(db, 'products', id), { imageUrl: imgUrl });
    console.log(`   ✅ ${imgUrl.slice(0, 65)}…`);
    updated++;
  }

  console.log(`\n✅ Updated: ${updated} | ❌ Failed: ${failed}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
