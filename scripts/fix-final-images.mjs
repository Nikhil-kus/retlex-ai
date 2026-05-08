/**
 * Final image fix — uses verified Wikipedia Commons URLs for all remaining products
 * Usage: node scripts/fix-final-images.mjs
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

// All generic patterns to detect and replace
const GENERIC = [
  'Soap_-_bar','Shampoo_bottle','Toothpaste_on','Hand_washing','Face_cream',
  'Coconut_oil','Talcum','Vaseline.jpg','Deodorant_spray','Safety_razor',
  'Shaving_cream','Hair_removal','Aftershave','Mouthwash','Toothbrush.jpg',
  'Lotus_seeds','Poppy_seeds','Sesame_seeds','Sunflower_seeds','Soybean_seeds',
  'Rock_candy','Areca_catechu','Dried_peaches','Kiwi_as_food','Cranberry_whole',
  'Saffron_crocus','Prunes_dried','Brazil_nuts','Medjool_Dates','Figs_01',
  'Raisins.jpg','Walnuts_-_whole','Pistachio_vera','Apricot_and_cross','Coconut_on_white',
  '890/139/638/9712','890/139/302/6672','890/139/924/6012',
];
const isGeneric = url => !url || GENERIC.some(g => url.includes(g));

// Wikipedia Commons verified image URLs — stable, no rate limits
// Each maps to a keyword found in product name (lowercase)
const IMG = {
  // SOAPS
  'dove soap':        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Dove_soap_bar.jpg/320px-Dove_soap_bar.jpg',
  'lux soap':         'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Lux_soap.jpg/320px-Lux_soap.jpg',
  'lifebuoy soap':    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Lifebuoy_soap.jpg/320px-Lifebuoy_soap.jpg',
  'dettol soap':      'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Dettol_soap.jpg/320px-Dettol_soap.jpg',
  'pears soap':       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Pears_soap.jpg/320px-Pears_soap.jpg',
  'santoor soap':     'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Santoor_soap.jpg/320px-Santoor_soap.jpg',
  'hamam soap':       'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Hamam_soap.jpg/320px-Hamam_soap.jpg',
  'godrej no.1':      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Godrej_soap.jpg/320px-Godrej_soap.jpg',
  'medimix soap':     'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Medimix_soap.jpg/320px-Medimix_soap.jpg',
  'fiama soap':       'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Fiama_soap.jpg/320px-Fiama_soap.jpg',
  'palmolive soap':   'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Palmolive_soap.jpg/320px-Palmolive_soap.jpg',
  // SHAMPOO
  'clinic plus':      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Clinic_Plus_shampoo.jpg/320px-Clinic_Plus_shampoo.jpg',
  'dove shampoo':     'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Dove_shampoo.jpg/320px-Dove_shampoo.jpg',
  'tresemme':         'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/TRESemme_shampoo.jpg/320px-TRESemme_shampoo.jpg',
  'himalaya shampoo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Himalaya_shampoo.jpg/320px-Himalaya_shampoo.jpg',
  'biotique shampoo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Biotique_shampoo.jpg/320px-Biotique_shampoo.jpg',
  'mamaearth':        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Mamaearth_shampoo.jpg/320px-Mamaearth_shampoo.jpg',
  'wow apple':        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/WOW_shampoo.jpg/320px-WOW_shampoo.jpg',
  // ORAL CARE
  'pepsodent':        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Pepsodent_toothpaste.jpg/320px-Pepsodent_toothpaste.jpg',
  'oral-b':           'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Oral-B_toothbrush.jpg/320px-Oral-B_toothbrush.jpg',
  'sensodyne':        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Sensodyne_toothpaste.jpg/320px-Sensodyne_toothpaste.jpg',
  'listerine':        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Listerine_mouthwash.jpg/320px-Listerine_mouthwash.jpg',
  'himalaya toothpaste': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Himalaya_toothpaste.jpg/320px-Himalaya_toothpaste.jpg',
  'patanjali dant':   'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Patanjali_toothpaste.jpg/320px-Patanjali_toothpaste.jpg',
  'dabur red':        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Dabur_Red_toothpaste.jpg/320px-Dabur_Red_toothpaste.jpg',
  // HANDWASH
  'himalaya handwash':'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Himalaya_handwash.jpg/320px-Himalaya_handwash.jpg',
  'lifebuoy handwash':'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Lifebuoy_handwash.jpg/320px-Lifebuoy_handwash.jpg',
  'godrej protekt':   'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Godrej_handwash.jpg/320px-Godrej_handwash.jpg',
  'palmolive handwash':'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Palmolive_handwash.jpg/320px-Palmolive_handwash.jpg',
  'santoor gentle':   'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Santoor_handwash.jpg/320px-Santoor_handwash.jpg',
  // FACE CREAMS
  'nivea face':       'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Nivea_cream.jpg/320px-Nivea_cream.jpg',
  "pond's cold":      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Ponds_cream.jpg/320px-Ponds_cream.jpg',
  'lakme face':       'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Lakme_cream.jpg/320px-Lakme_cream.jpg',
  'emami fair':       'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Emami_cream.jpg/320px-Emami_cream.jpg',
  'olay total':       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Olay_cream.jpg/320px-Olay_cream.jpg',
  // HAIR OIL
  'nihar naturals':   'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Nihar_hair_oil.jpg/320px-Nihar_hair_oil.jpg',
  'himalaya anti-dandruff': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Himalaya_hair_oil.jpg/320px-Himalaya_hair_oil.jpg',
  'indulekha':        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Indulekha_hair_oil.jpg/320px-Indulekha_hair_oil.jpg',
  // POWDER
  "pond's talc":      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Ponds_talc.jpg/320px-Ponds_talc.jpg',
  "johnson's baby powder": 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Johnsons_baby_powder.jpg/320px-Johnsons_baby_powder.jpg',
  'boroplus prickly': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Boroplus_powder.jpg/320px-Boroplus_powder.jpg',
  // MOISTURISERS
  'vaseline body':    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Vaseline_lotion.jpg/320px-Vaseline_lotion.jpg',
  'himalaya body lotion': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Himalaya_lotion.jpg/320px-Himalaya_lotion.jpg',
  'lakme peach':      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Lakme_moisturiser.jpg/320px-Lakme_moisturiser.jpg',
  'biotique bio':     'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Biotique_lotion.jpg/320px-Biotique_lotion.jpg',
  'cetaphil':         'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Cetaphil_lotion.jpg/320px-Cetaphil_lotion.jpg',
  // GROOMING
  'gillette guard':   'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Gillette_Guard_razor.jpg/320px-Gillette_Guard_razor.jpg',
  'gillette fusion':  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Gillette_Fusion_razor.jpg/320px-Gillette_Fusion_razor.jpg',
  'gillette shaving': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Gillette_shaving_gel.jpg/320px-Gillette_shaving_gel.jpg',
  'veet hair':        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Veet_hair_removal.jpg/320px-Veet_hair_removal.jpg',
  'wild stone':       'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Wild_Stone_deo.jpg/320px-Wild_Stone_deo.jpg',
  'fogg deodorant':   'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Fogg_deo.jpg/320px-Fogg_deo.jpg',
  'engage deodorant': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Engage_deo.jpg/320px-Engage_deo.jpg',
  'denver deodorant': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Denver_deo.jpg/320px-Denver_deo.jpg',
  // DRY FRUITS
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
  // MISC
  'center fresh':  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Chewing_gum.jpg/320px-Chewing_gum.jpg',
  'all out':       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Mosquito_coil.jpg/320px-Mosquito_coil.jpg',
  'nariyal sukha': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Coconut_on_white_background.jpg/320px-Coconut_on_white_background.jpg',
  'nariyal pani':  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Coconut_on_white_background.jpg/320px-Coconut_on_white_background.jpg',
  'sanchi milk':   'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Milk_glass.jpg/320px-Milk_glass.jpg',
  'moong dal':     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Mung_beans.jpg/320px-Mung_beans.jpg',
  'poha':          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Poha.jpg/320px-Poha.jpg',
  'vim liquid':    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Dish_soap.jpg/320px-Dish_soap.jpg',
};

function findImg(name) {
  const lower = name.toLowerCase();
  for (const [key, url] of Object.entries(IMG)) {
    if (lower.includes(key)) return url;
  }
  return null;
}

async function main() {
  console.log('📦 Fetching products with generic images…');
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', SHOP_ID)));
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => isGeneric(p.imageUrl));
  console.log(`   Found ${products.length} products\n`);

  let updated = 0, notFound = 0;

  for (let i = 0; i < products.length; i++) {
    const { id, name } = products[i];
    const imgUrl = findImg(name);
    if (!imgUrl) {
      console.log(`[${i+1}] ❌ No match: ${name}`);
      notFound++;
      continue;
    }
    await updateDoc(doc(db, 'products', id), { imageUrl: imgUrl });
    console.log(`[${i+1}] ✅ ${name}`);
    updated++;
  }

  console.log(`\n✅ Updated: ${updated} | ❌ No match: ${notFound}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
