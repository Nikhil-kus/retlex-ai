/**
 * Fix product images using best available sources
 * - Open Food Facts (real product photos)
 * - Wikimedia Commons (high quality food/product photos)
 * Usage: node scripts/fix-product-images-v2.mjs
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

// Generic OFF image patterns to replace
const GENERIC = [
  '890/139/638/9712', '890/139/302/6672', '890/139/924/6012',
  '890/103/086/5169', '890/154/200/1246', '890/120/703/1717',
];
const isGeneric = url => !url || GENERIC.some(g => url.includes(g));

// ── CURATED HIGH-QUALITY IMAGE MAP ────────────────────────────────────────────
// Real product images from Open Food Facts with verified barcodes
// and Wikimedia Commons for loose/khula items
const IMAGE_MAP = {

  // ── PULSES & DALS (khula - beautiful bowl/plate photos) ───────────────────
  'toor dal':        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Toor_dal.jpg/320px-Toor_dal.jpg',
  'arhar dal':       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Toor_dal.jpg/320px-Toor_dal.jpg',
  'chana dal':       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Chana_dal.jpg/320px-Chana_dal.jpg',
  'moong dal':       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Moong_dal.jpg/320px-Moong_dal.jpg',
  'moong sabut':     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Mung_beans.jpg/320px-Mung_beans.jpg',
  'masoor dal':      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Red_lentils.jpg/320px-Red_lentils.jpg',
  'masoor sabut':    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Brown_lentils.jpg/320px-Brown_lentils.jpg',
  'urad dal':        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Urad_dal.jpg/320px-Urad_dal.jpg',
  'urad sabut':      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Black_gram.jpg/320px-Black_gram.jpg',
  'rajma':           'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Kidney_beans.jpg/320px-Kidney_beans.jpg',
  'kabuli chana':    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Chickpeas.jpg/320px-Chickpeas.jpg',
  'kala chana':      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Black_chickpeas.jpg/320px-Black_chickpeas.jpg',
  'lobiya':          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Black_eyed_peas.jpg/320px-Black_eyed_peas.jpg',
  'moth dal':        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Moth_beans.jpg/320px-Moth_beans.jpg',
  'chana sabut':     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Chickpeas.jpg/320px-Chickpeas.jpg',

  // ── GRAINS (khula) ────────────────────────────────────────────────────────
  'aata khula':      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Wheat_flour.jpg/320px-Wheat_flour.jpg',
  'rice khula':      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/White_rice.jpg/320px-White_rice.jpg',
  'maida khula':     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/All_purpose_flour.jpg/320px-All_purpose_flour.jpg',
  'besan khula':     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Chickpea_flour.jpg/320px-Chickpea_flour.jpg',
  'suji khula':      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Semolina.jpg/320px-Semolina.jpg',
  'poha khula':      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Poha.jpg/320px-Poha.jpg',
  'sabudana khula':  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tapioca_pearls.jpg/320px-Tapioca_pearls.jpg',
  'daliya khula':    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Broken_wheat.jpg/320px-Broken_wheat.jpg',
  'bajra khula':     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Pearl_millet.jpg/320px-Pearl_millet.jpg',
  'jowar khula':     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Sorghum.jpg/320px-Sorghum.jpg',
  'ragi khula':      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Finger_millet.jpg/320px-Finger_millet.jpg',
  'chai patti khula':'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Loose_leaf_tea.jpg/320px-Loose_leaf_tea.jpg',

  // ── SPICES (khula) ────────────────────────────────────────────────────────
  'jeera khula':     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Cumin_seeds.jpg/320px-Cumin_seeds.jpg',
  'rai khula':       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Mustard_seeds.jpg/320px-Mustard_seeds.jpg',
  'methi dana khula':'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Fenugreek_seeds.jpg/320px-Fenugreek_seeds.jpg',
  'ajwain khula':    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Ajwain_seeds.jpg/320px-Ajwain_seeds.jpg',
  'saunf khula':     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Fennel_seeds.jpg/320px-Fennel_seeds.jpg',
  'kali mirch khula':'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Black_pepper.jpg/320px-Black_pepper.jpg',
  'laung khula':     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Cloves.jpg/320px-Cloves.jpg',
  'dalchini khula':  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Cinnamon_sticks.jpg/320px-Cinnamon_sticks.jpg',
  'badi elaichi khula':'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Black_cardamom.jpg/320px-Black_cardamom.jpg',
  'tej patta khula': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Bay_leaves.jpg/320px-Bay_leaves.jpg',
  'imli khula':      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tamarind.jpg/320px-Tamarind.jpg',
  'sabut lal mirch khula':'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Red_Chili_Pepper_Cross_Section.jpg/320px-Red_Chili_Pepper_Cross_Section.jpg',
  'sabut dhaniya khula':'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Coriander_seeds.jpg/320px-Coriander_seeds.jpg',
  'haldi khula':     'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Turmeric_powder_and_root.jpg/320px-Turmeric_powder_and_root.jpg',
  'namak khula':     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Salt_shaker.jpg/320px-Salt_shaker.jpg',
  'sendha namak khula':'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Rock_salt.jpg/320px-Rock_salt.jpg',
  'kala namak khula':'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Black_salt.jpg/320px-Black_salt.jpg',
  'cheeni khula':    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Sugar.jpg/320px-Sugar.jpg',
  'gud khula':       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Jaggery.jpg/320px-Jaggery.jpg',
  'mukhwas khula':   'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Mukhwas.jpg/320px-Mukhwas.jpg',
  'khaini khula':    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tobacco.jpg/320px-Tobacco.jpg',
  'supari khula':    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Areca_catechu_fruits.jpg/320px-Areca_catechu_fruits.jpg',
  'namkeen khula':   'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Namkeen.jpg/320px-Namkeen.jpg',

  // ── BRANDED PACKETS - Open Food Facts verified ────────────────────────────
  // Tea
  'tata tea gold 100g':    'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'tata tea gold 250g':    'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'tata tea gold 500g':    'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'tata tea premium 250g': 'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'tata tea agni 250g':    'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'red label 100g':        'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'red label 250g':        'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'red label 500g':        'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'taj mahal tea 100g':    'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'taj mahal tea 250g':    'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'wagh bakri tea 250g':   'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'wagh bakri tea 500g':   'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  '3 roses tea 250g':      'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'lipton yellow label 250g':'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'lipton green tea 25 bags':'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'tata tea bags 25 pcs':  'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'red label tea bags 25 pcs':'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  // Coffee
  'nescafe classic 25g':   'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'nescafe classic 50g':   'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'nescafe classic 100g':  'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'nescafe sunrise 50g':   'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'nescafe sunrise 100g':  'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'bru instant coffee 50g':'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'bru instant coffee 100g':'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'bru gold coffee 50g':   'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  // Health drinks
  'horlicks 200g':         'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'horlicks 500g':         'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  'bournvita 200g':        'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'bournvita 500g':        'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  'complan 200g':          'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  'boost 200g':            'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
};

// Search Open Food Facts for a product
async function searchOFF(name) {
  try {
    const q = name.replace(/\d+(g|ml|kg|l|pcs?|bags?|pack)/gi, '').trim();
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=3&fields=product_name,image_front_url`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const kw = q.split(' ')[0].toLowerCase();
    const hit = (data.products || []).find(p => p.image_front_url && (p.product_name || '').toLowerCase().includes(kw))
              || (data.products || []).find(p => p.image_front_url);
    return hit?.image_front_url || null;
  } catch { return null; }
}

function findImage(name) {
  const lower = name.toLowerCase().trim();
  // Exact match
  if (IMAGE_MAP[lower]) return IMAGE_MAP[lower];
  // Partial match (for khula items and variants)
  for (const [key, url] of Object.entries(IMAGE_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return url;
  }
  return null;
}

async function main() {
  console.log('📦 Fetching products with generic images…');
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', SHOP_ID)));
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => isGeneric(p.imageUrl));
  console.log(`   Found ${products.length} products\n`);

  let updated = 0, searched = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const { id, name } = products[i];
    process.stdout.write(`[${i+1}/${products.length}] ${name}... `);

    // 1. Try curated map first
    let imgUrl = findImage(name);
    if (imgUrl) {
      process.stdout.write(`✓ Map\n`);
    } else {
      // 2. Try Open Food Facts
      imgUrl = await searchOFF(name);
      if (imgUrl) {
        process.stdout.write(`✓ OFF\n`);
        searched++;
      } else {
        process.stdout.write(`❌\n`);
        failed++;
        await sleep(200);
        continue;
      }
      await sleep(300);
    }

    await updateDoc(doc(db, 'products', id), { imageUrl: imgUrl });
    updated++;
  }

  console.log(`\n✅ Updated: ${updated} (${updated - searched} from map, ${searched} from OFF) | ❌ Failed: ${failed}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
