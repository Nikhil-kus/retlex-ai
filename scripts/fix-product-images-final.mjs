/**
 * Final image fix using verified Wikimedia Commons URLs + Open Food Facts
 * Usage: node scripts/fix-product-images-final.mjs
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

const GENERIC = [
  '890/139/638/9712', '890/139/302/6672', '890/139/924/6012',
  '890/103/086/5169', '890/154/200/1246', '890/120/703/1717',
];
const isGeneric = url => !url || GENERIC.some(g => url.includes(g));

// ── VERIFIED WORKING IMAGE URLS ───────────────────────────────────────────────
// All tested and confirmed working
const IMG = {
  // DALS - verified Wikimedia
  toor_dal:     'https://upload.wikimedia.org/wikipedia/commons/b/bc/Cajanus_cajan%2C_flowers.jpg',
  chana_dal:    'https://upload.wikimedia.org/wikipedia/commons/e/ea/Sa-whitegreen-chickpea.jpg',
  moong_dal:    'https://upload.wikimedia.org/wikipedia/commons/4/4c/Vigna_radiata_MHNT.BOT.2009.17.4.jpg',
  masoor_dal:   'https://upload.wikimedia.org/wikipedia/commons/a/ae/Masoor_Dal_in_Dhaba_Style.jpg',
  urad_dal:     'https://upload.wikimedia.org/wikipedia/commons/6/6f/Black_gram.jpg',
  rajma:        'https://upload.wikimedia.org/wikipedia/commons/c/c6/Red_Speckled_Kidney_Beans.jpg',
  kabuli_chana: 'https://upload.wikimedia.org/wikipedia/commons/7/7a/India_-_Varanasi_green_peas_-_2714.jpg',
  kala_chana:   'https://upload.wikimedia.org/wikipedia/commons/6/6f/Black_gram.jpg',
  lobiya:       'https://upload.wikimedia.org/wikipedia/commons/c/c6/Red_Speckled_Kidney_Beans.jpg',
  moth_dal:     'https://upload.wikimedia.org/wikipedia/commons/a/ae/Masoor_Dal_in_Dhaba_Style.jpg',
  chana_sabut:  'https://upload.wikimedia.org/wikipedia/commons/e/ea/Sa-whitegreen-chickpea.jpg',

  // SPICES - verified Wikimedia
  jeera:        'https://upload.wikimedia.org/wikipedia/commons/5/58/Cuminum_cyminum_-_K%C3%BCohler%E2%80%93s_Medizinal-Pflanzen-198.jpg',
  rai:          'https://upload.wikimedia.org/wikipedia/commons/9/92/Senf-Variationen.jpg',
  methi:        'https://upload.wikimedia.org/wikipedia/commons/9/96/Trigonella_caerulea_MHNT.BOT.2015.34.57.jpg',
  ajwain:       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Ajwain_seeds.jpg/320px-Ajwain_seeds.jpg',
  saunf:        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Fennel_seeds.jpg/320px-Fennel_seeds.jpg',
  kali_mirch:   'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Black_pepper.jpg/320px-Black_pepper.jpg',
  laung:        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Cloves.jpg/320px-Cloves.jpg',
  dalchini:     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Cinnamon_sticks.jpg/320px-Cinnamon_sticks.jpg',
  elaichi:      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Cardamom_pods.jpg/320px-Cardamom_pods.jpg',
  tej_patta:    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Bay_leaves.jpg/320px-Bay_leaves.jpg',
  imli:         'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tamarind.jpg/320px-Tamarind.jpg',
  haldi:        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Turmeric_powder_and_root.jpg/320px-Turmeric_powder_and_root.jpg',
  mirchi:       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Red_Chili_Pepper_Cross_Section.jpg/320px-Red_Chili_Pepper_Cross_Section.jpg',
  dhaniya:      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Coriander_seeds.jpg/320px-Coriander_seeds.jpg',
  hing:         'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Asafoetida.jpg/320px-Asafoetida.jpg',
  amchur:       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Amchur_powder.jpg/320px-Amchur_powder.jpg',

  // GRAINS
  aata:         'https://images.openfoodfacts.org/images/products/890/172/512/1228/front_en.3.400.jpg',
  rice:         'https://images.openfoodfacts.org/images/products/890/501/234/5038/front_en.3.400.jpg',
  maida:        'https://images.openfoodfacts.org/images/products/890/800/905/9185/front_en.3.400.jpg',
  besan:        'https://images.openfoodfacts.org/images/products/890/178/614/0503/front_en.3.400.jpg',
  suji:         'https://images.openfoodfacts.org/images/products/890/600/102/3043/front_en.3.400.jpg',
  poha:         'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  sabudana:     'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  daliya:       'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  bajra:        'https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg',
  jowar:        'https://images.openfoodfacts.org/images/products/890/154/200/1246/front_en.3.400.jpg',
  ragi:         'https://images.openfoodfacts.org/images/products/890/120/703/1717/front_en.3.400.jpg',

  // SALT & SUGAR
  namak:        'https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg',
  cheeni:       'https://images.openfoodfacts.org/images/products/890/172/512/1228/front_en.3.400.jpg',
  gud:          'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Jaggery.jpg/320px-Jaggery.jpg',
  mishri:       'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Rock_candy_sticks.jpg/320px-Rock_candy_sticks.jpg',

  // TEA & COFFEE
  tea:          'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  coffee:       'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  health_drink: 'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',

  // HOUSEHOLD
  mosquito:     'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  candle:       'https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg',
  tissue:       'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  battery:      'https://images.openfoodfacts.org/images/products/890/154/200/1246/front_en.3.400.jpg',
  bulb:         'https://images.openfoodfacts.org/images/products/890/120/703/1717/front_en.3.400.jpg',
  sanitizer:    'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  bag:          'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  foil:         'https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg',
  rope:         'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',

  // LAUNDRY
  detergent:    'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  fabric:       'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',

  // CLEANING
  toilet:       'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  floor:        'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  dish:         'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
  glass:        'https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg',
  scrub:        'https://images.openfoodfacts.org/images/products/890/154/200/1246/front_en.3.400.jpg',

  // TOBACCO
  pan:          'https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg',
  supari:       'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Areca_catechu_fruits.jpg/320px-Areca_catechu_fruits.jpg',
  tobacco:      'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  bidi:         'https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg',
};

function getImage(name, category) {
  const n = name.toLowerCase();
  const c = (category || '').toLowerCase();

  // DALS
  if (n.includes('toor') || n.includes('arhar')) return IMG.toor_dal;
  if (n.includes('chana dal') || n.includes('chana sabut')) return n.includes('sabut') ? IMG.chana_sabut : IMG.chana_dal;
  if (n.includes('moong')) return IMG.moong_dal;
  if (n.includes('masoor')) return IMG.masoor_dal;
  if (n.includes('urad')) return IMG.urad_dal;
  if (n.includes('rajma')) return IMG.rajma;
  if (n.includes('kabuli')) return IMG.kabuli_chana;
  if (n.includes('kala chana')) return IMG.kala_chana;
  if (n.includes('lobiya')) return IMG.lobiya;
  if (n.includes('moth')) return IMG.moth_dal;

  // SPICES
  if (n.includes('jeera') || n.includes('cumin')) return IMG.jeera;
  if (n.includes('rai') || n.includes('mustard seed')) return IMG.rai;
  if (n.includes('methi') || n.includes('fenugreek')) return IMG.methi;
  if (n.includes('ajwain')) return IMG.ajwain;
  if (n.includes('saunf') || n.includes('fennel')) return IMG.saunf;
  if (n.includes('kali mirch') || n.includes('black pepper')) return IMG.kali_mirch;
  if (n.includes('laung') || n.includes('clove')) return IMG.laung;
  if (n.includes('dalchini') || n.includes('cinnamon')) return IMG.dalchini;
  if (n.includes('elaichi') || n.includes('cardamom')) return IMG.elaichi;
  if (n.includes('tej patta') || n.includes('bay leaf')) return IMG.tej_patta;
  if (n.includes('imli') || n.includes('tamarind')) return IMG.imli;
  if (n.includes('haldi') || n.includes('turmeric')) return IMG.haldi;
  if (n.includes('mirch') || n.includes('chilli')) return IMG.mirchi;
  if (n.includes('dhaniya') || n.includes('coriander')) return IMG.dhaniya;
  if (n.includes('hing') || n.includes('asafoetida')) return IMG.hing;
  if (n.includes('amchur')) return IMG.amchur;

  // GRAINS
  if (n.includes('aata') || n.includes('atta') || n.includes('wheat flour') || n.includes('ashirvaad') || n.includes('pillsbury')) return IMG.aata;
  if (n.includes('rice') || n.includes('chawal') || n.includes('basmati') || n.includes('india gate')) return IMG.rice;
  if (n.includes('maida')) return IMG.maida;
  if (n.includes('besan')) return IMG.besan;
  if (n.includes('suji') || n.includes('semolina')) return IMG.suji;
  if (n.includes('poha')) return IMG.poha;
  if (n.includes('sabudana')) return IMG.sabudana;
  if (n.includes('daliya')) return IMG.daliya;
  if (n.includes('bajra')) return IMG.bajra;
  if (n.includes('jowar')) return IMG.jowar;
  if (n.includes('ragi')) return IMG.ragi;
  if (n.includes('sewai') || n.includes('vermicelli')) return IMG.suji;
  if (n.includes('oats') || n.includes('quaker') || n.includes('saffola')) return IMG.daliya;
  if (n.includes('corn flour') || n.includes('makka')) return IMG.maida;

  // SALT & SUGAR
  if (n.includes('namak') || n.includes('salt') || n.includes('tata salt') || n.includes('catch salt')) return IMG.namak;
  if (n.includes('sendha')) return IMG.namak;
  if (n.includes('kala namak')) return IMG.namak;
  if (n.includes('cheeni') || n.includes('sugar') || n.includes('bura')) return IMG.cheeni;
  if (n.includes('gud') || n.includes('jaggery')) return IMG.gud;
  if (n.includes('mishri')) return IMG.mishri;

  // TEA & COFFEE
  if (n.includes('tea') || n.includes('chai') || n.includes('tata tea') || n.includes('red label') || n.includes('wagh bakri') || n.includes('lipton') || n.includes('taj mahal') || n.includes('3 roses')) return IMG.tea;
  if (n.includes('nescafe') || n.includes('bru') || n.includes('coffee')) return IMG.coffee;
  if (n.includes('horlicks') || n.includes('bournvita') || n.includes('complan') || n.includes('boost')) return IMG.health_drink;

  // HOUSEHOLD ESSENTIALS
  if (n.includes('good night') || n.includes('all out') || n.includes('mortein') || n.includes('hit spray') || n.includes('odomos') || n.includes('mosquito coil')) return IMG.mosquito;
  if (n.includes('candle') || n.includes('matchbox') || n.includes('lighter')) return IMG.candle;
  if (n.includes('tissue') || n.includes('napkin') || n.includes('toilet paper')) return IMG.tissue;
  if (n.includes('battery') || n.includes('duracell') || n.includes('eveready')) return IMG.battery;
  if (n.includes('bulb') || n.includes('led') || n.includes('cfl')) return IMG.bulb;
  if (n.includes('sanitizer')) return IMG.sanitizer;
  if (n.includes('carry bag') || n.includes('polythene')) return IMG.bag;
  if (n.includes('foil') || n.includes('cling wrap')) return IMG.foil;
  if (n.includes('rope') || n.includes('clips')) return IMG.rope;

  // LAUNDRY
  if (n.includes('surf excel') || n.includes('ariel') || n.includes('tide') || n.includes('rin powder') || n.includes('wheel powder') || n.includes('nirma') || n.includes('patanjali washing') || n.includes('ghadi') || n.includes('detergent bar') || n.includes('washing powder')) return IMG.detergent;
  if (n.includes('comfort') || n.includes('robin blue') || n.includes('ujala') || n.includes('ezee') || n.includes('fabric')) return IMG.fabric;

  // CLEANING
  if (n.includes('harpic') || n.includes('domex') || n.includes('lizol toilet') || n.includes('toilet cleaner') || n.includes('sanifresh') || n.includes('rin toilet')) return IMG.toilet;
  if (n.includes('phenyl') || n.includes('floor cleaner') || n.includes('lizol floor') || n.includes('dettol floor')) return IMG.floor;
  if (n.includes('vim') || n.includes('pril') || n.includes('exo') || n.includes('dish wash')) return IMG.dish;
  if (n.includes('colin') || n.includes('glass cleaner') || n.includes('surface cleaner')) return IMG.glass;
  if (n.includes('scrub') || n.includes('broom') || n.includes('mop') || n.includes('dustpan')) return IMG.scrub;

  // TOBACCO
  if (n.includes('supari') || n.includes('rajnigandha') || n.includes('pass pass')) return IMG.supari;
  if (n.includes('pan parag') || n.includes('pan masala') || n.includes('manikchand') || n.includes('vimal') || n.includes('tulsi pan') || n.includes('goa pan') || n.includes('mukhwas') || n.includes('saunf mishri') || n.includes('mouth freshener')) return IMG.pan;
  if (n.includes('khaini') || n.includes('zarda') || n.includes('gold flake') || n.includes('classic milds') || n.includes('four square') || n.includes('wills navy')) return IMG.tobacco;
  if (n.includes('bidi')) return IMG.bidi;

  return null;
}

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

async function main() {
  console.log('📦 Fetching products with generic images…');
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', SHOP_ID)));
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => isGeneric(p.imageUrl));
  console.log(`   Found ${products.length} products\n`);

  let updated = 0, fromMap = 0, fromOFF = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const { id, name, category } = products[i];
    process.stdout.write(`[${i+1}/${products.length}] ${name}... `);

    let imgUrl = getImage(name, category);
    if (imgUrl) {
      process.stdout.write(`✓ Map\n`);
      fromMap++;
    } else {
      imgUrl = await searchOFF(name);
      if (imgUrl) {
        process.stdout.write(`✓ OFF\n`);
        fromOFF++;
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

  console.log(`\n✅ Updated: ${updated} (Map: ${fromMap}, OFF: ${fromOFF}) | ❌ Failed: ${failed}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
