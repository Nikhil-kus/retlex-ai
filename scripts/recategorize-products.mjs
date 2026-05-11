/**
 * Recategorize all products into proper systematic categories
 * Usage: node scripts/recategorize-products.mjs
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

// ── CATEGORY RULES ────────────────────────────────────────────────────────────
// Maps product name keywords (lowercase) → correct category
// More specific rules first, general last
const CATEGORY_RULES = [

  // ── GROCERY & STAPLES ──────────────────────────────────────────────────────
  { keywords: ['tata salt','namak','salt'], cat: 'Salt & Sugar' },
  { keywords: ['sugar','cheeni','shakkar'], cat: 'Salt & Sugar' },
  { keywords: ['aata','atta','wheat flour','maida','suji','sooji','besan'], cat: 'Grains & Cereals' },
  { keywords: ['rice','chawal','basmati','poha','sabudana'], cat: 'Grains & Cereals' },
  { keywords: ['dal','daal','chana dal','urad dal','moong dal','masoor dal','toor dal'], cat: 'Pulses & Dals' },
  // Hair Oil — must be before Oils & Ghee
  { keywords: ['hair oil','amla oil','almond hair','vatika hair','nihar hair','kesh king','indulekha','parachute coconut oil','bajaj almond hair','chameli','jasmine oil'], cat: 'Hair Oil' },
  { keywords: ['mustard oil','sarson','refined oil','sunflower oil','dhara oil','fortune oil','ghee','vanaspati','cooking oil'], cat: 'Oils & Ghee' },
  { keywords: ['haldi','turmeric','dhaniya','coriander','jeera','cumin','garam masala','masala','mirchi','chilli','kali mirch','pepper','ajwain','methi','saunf','hing','asafoetida','bay leaf','tej patta'], cat: 'Spices & Masala' },
  { keywords: ['tea','chai','tata tea','red label','brooke bond','lipton','green tea'], cat: 'Tea & Coffee' },
  { keywords: ['coffee','nescafe','bru','horlicks'], cat: 'Tea & Coffee' },
  { keywords: ['milk','doodh','amul milk','sanchi milk','mother dairy'], cat: 'Dairy & Milk Products' },
  { keywords: ['paneer','curd','dahi','butter','cheese','cream','ghee amul'], cat: 'Dairy & Milk Products' },
  { keywords: ['maggi','noodles','yippee','top ramen','instant','wai wai','waiwai','knorr soupy','soupy noodles','upma mix','idli mix','poha mix','mtr upma','mtr poha','gits idli','gits'], cat: 'Instant Foods & Noodles' },
  { keywords: ['biscuit','parle-g','parle g','marie gold','good day','bourbon','hide & seek','oreo','digestive','glucose'], cat: 'Biscuits & Snacks' },
  { keywords: ['namkeen','kurkure','lays','chips','bhujia','haldiram','mixture','sev','chivda'], cat: 'Biscuits & Snacks' },
  { keywords: ['chocolate','dairy milk','kitkat','perk','5 star','munch','gems','candy','toffee','pulse candy','center fresh','chewing gum'], cat: 'Confectionery' },
  { keywords: ['gud','jaggery'], cat: 'Salt & Sugar' },
  { keywords: ['mishri','sugar candy','rock sugar'], cat: 'Dry Fruits' },

  // ── BEVERAGES ──────────────────────────────────────────────────────────────
  { keywords: ['juice','frooti','maaza','slice','nimbu pani','sharbat','rooh afza'], cat: 'Beverages' },
  { keywords: ['cold drink','pepsi','coca cola','sprite','limca','thums up','fanta','7up','mountain dew'], cat: 'Beverages' },
  { keywords: ['water','mineral water','bisleri','kinley'], cat: 'Beverages' },
  { keywords: ['nariyal pani','coconut water','tender coconut'], cat: 'Beverages' },

  // ── BEAUTY & PERSONAL CARE ─────────────────────────────────────────────────
  // Soaps
  { keywords: ['lux soap','dove soap','lifebuoy soap','dettol soap','pears soap','santoor soap','hamam soap','cinthol soap','godrej no.1 soap','medimix soap','fiama soap','palmolive soap','soap big','soap bar'], cat: 'Soaps' },
  // Shampoo
  { keywords: ['shampoo','hair cleanser'], cat: 'Shampoo' },
  // Oral Care — specific product names to avoid false matches
  { keywords: ['toothpaste','toothbrush','mouthwash','dant kanti','colgate toothpaste','colgate mouthwash','colgate 360','pepsodent','close up toothpaste','sensodyne','oral-b','listerine','himalaya toothpaste','patanjali dant'], cat: 'Oral Care' },
  // Handwash
  { keywords: ['handwash','hand wash'], cat: 'Handwash' },
  // Face Creams — must be before dairy to avoid "cream" matching milk products
  { keywords: ['face cream','cold cream','glow & lovely','fair & lovely','pond\'s cream','nivea face','lakme face','olay','garnier cream','emami fair','fair and handsome','skin cream','beauty cream','fairness cream'], cat: 'Face Creams' },
  // Moisturisers — before dairy
  { keywords: ['body lotion','moisturiser','moisturizer','vaseline','cetaphil','lakme peach','biotique lotion','parachute advansed'], cat: 'Moisturisers' },
  // Grooming — before dairy
  { keywords: ['razor','shaving gel','shaving cream','aftershave','deodorant','deo spray','axe deo','fogg deo','wild stone','engage deo','denver deo','nivea men','veet hair removal','hair removal cream'], cat: 'Grooming' },
  // General personal care
  { keywords: ['boroplus','dettol antiseptic','savlon','band aid'], cat: 'Personal Care' },

  // ── HOUSEHOLD ──────────────────────────────────────────────────────────────
  { keywords: ['vim','harpic','phenyl','lizol','colin','domex','toilet cleaner','floor cleaner','dish wash','dishwash','utensil'], cat: 'Household Cleaning' },
  { keywords: ['surf excel','ariel','tide','rin','wheel','washing powder','detergent','fabric'], cat: 'Laundry' },
  { keywords: ['tissue','napkin','toilet paper','sanitary','pad','whisper','stayfree'], cat: 'Household Essentials' },
  { keywords: ['matchbox','matches','lighter'], cat: 'Household Essentials' },
  { keywords: ['carry bag','polythene','plastic bag','cover'], cat: 'Household Essentials' },
  { keywords: ['agarbatti','incense','dhoop','camphor','kapoor'], cat: 'Pooja Items' },
  { keywords: ['good night','all out','mosquito','coil','hit','baygon','repellent'], cat: 'Household Essentials' },

  // ── DRY FRUITS ─────────────────────────────────────────────────────────────
  { keywords: ['badam','kaju','kishmish','akhrot','pista','chhuara','anjeer','makhana','munakka','khajoor','chilgoza','kharik','mix dry fruits','khubani','mishri','soyabean beej','supari','sukhi aadu','khopra','sukhi kiwi','cranberry','kesar','alubukhara','khaskhas','til ','surajmukhi beej','brazil nut','kala akhrot'], cat: 'Dry Fruits' },

  // ── TOBACCO ────────────────────────────────────────────────────────────────
  { keywords: ['supadi','supari','pan masala','gutkha','tobacco','cigarette','bidi'], cat: 'Tobacco & Pan' },

  // ── MISC ───────────────────────────────────────────────────────────────────
  { keywords: ['samai','vermicelli','sewai'], cat: 'Grains & Cereals' },
  { keywords: ['nariyal sukha','dry coconut','khopra'], cat: 'Dry Fruits' },
  { keywords: ['chameli','jasmine oil','hair perfume'], cat: 'Hair Oil' },
];

function getCategory(name) {
  const lower = name.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return rule.cat;
    }
  }
  return null; // keep existing
}

async function main() {
  console.log('📦 Fetching all products…');
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', SHOP_ID)));
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`   Total: ${products.length}\n`);

  // Count changes by category
  const changes = {};
  let updated = 0, kept = 0;

  for (const { id, name, category } of products) {
    const newCat = getCategory(name);
    if (!newCat || newCat === category) {
      kept++;
      continue;
    }
    await updateDoc(doc(db, 'products', id), { category: newCat });
    changes[`${category} → ${newCat}`] = (changes[`${category} → ${newCat}`] || 0) + 1;
    console.log(`  ${category} → ${newCat}: ${name}`);
    updated++;
  }

  console.log('\n══════════════════════════════════════');
  console.log(`✅ Updated: ${updated} | ⏭️ Kept: ${kept}`);
  console.log('\nChanges summary:');
  Object.entries(changes).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log('══════════════════════════════════════\n');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
