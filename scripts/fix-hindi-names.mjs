/**
 * Fix garbled Hindi names and add proper local shop pronunciation
 * Usage: node scripts/fix-hindi-names.mjs
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

// Local shop Hindi names — how shopkeepers and customers actually say it
// Format: product_name_keyword (lowercase) -> hindi_name
// Style: brand transliteration + product type in Hindi + size
const HINDI_NAMES = {
  // ── SOAPS ──────────────────────────────────────────────────────────────────
  'lux soap 75g':         'लक्स साबुन 75 ग्राम',
  'lux soap 100g':        'लक्स साबुन 100 ग्राम',
  'dove soap 75g':        'डव साबुन 75 ग्राम',
  'dove soap 100g':       'डव साबुन 100 ग्राम',
  'lifebuoy soap 75g':    'लाइफबॉय साबुन 75 ग्राम',
  'lifebuoy soap 100g':   'लाइफबॉय साबुन 100 ग्राम',
  'dettol soap 75g':      'डेटॉल साबुन 75 ग्राम',
  'dettol soap 100g':     'डेटॉल साबुन 100 ग्राम',
  'pears soap 75g':       'पियर्स साबुन 75 ग्राम',
  'pears soap 100g':      'पियर्स साबुन 100 ग्राम',
  'santoor soap 75g':     'संतूर साबुन 75 ग्राम',
  'santoor soap 100g':    'संतूर साबुन 100 ग्राम',
  'hamam soap 75g':       'हमाम साबुन 75 ग्राम',
  'hamam soap 100g':      'हमाम साबुन 100 ग्राम',
  'cinthol soap 75g':     'सिंथोल साबुन 75 ग्राम',
  'cinthol soap 100g':    'सिंथोल साबुन 100 ग्राम',
  'godrej no.1 soap 75g': 'गोदरेज नं.1 साबुन 75 ग्राम',
  'godrej no.1 soap 100g':'गोदरेज नं.1 साबुन 100 ग्राम',
  'medimix soap 75g':     'मेडिमिक्स साबुन 75 ग्राम',
  'medimix soap 100g':    'मेडिमिक्स साबुन 100 ग्राम',
  'fiama soap 75g':       'फियामा साबुन 75 ग्राम',
  'fiama soap 100g':      'फियामा साबुन 100 ग्राम',
  'palmolive soap 75g':   'पामोलिव साबुन 75 ग्राम',
  'palmolive soap 100g':  'पामोलिव साबुन 100 ग्राम',

  // ── SHAMPOO ────────────────────────────────────────────────────────────────
  'clinic plus shampoo 80ml':  'क्लिनिक प्लस शैम्पू 80 मिली',
  'clinic plus shampoo 180ml': 'क्लिनिक प्लस शैम्पू 180 मिली',
  'clinic plus shampoo 340ml': 'क्लिनिक प्लस शैम्पू 340 मिली',
  'sunsilk shampoo 80ml':      'सनसिल्क शैम्पू 80 मिली',
  'sunsilk shampoo 180ml':     'सनसिल्क शैम्पू 180 मिली',
  'sunsilk shampoo 340ml':     'सनसिल्क शैम्पू 340 मिली',
  'head & shoulders shampoo 80ml':  'हेड एंड शोल्डर शैम्पू 80 मिली',
  'head & shoulders shampoo 180ml': 'हेड एंड शोल्डर शैम्पू 180 मिली',
  'head & shoulders shampoo 340ml': 'हेड एंड शोल्डर शैम्पू 340 मिली',
  'pantene shampoo 80ml':      'पैंटीन शैम्पू 80 मिली',
  'pantene shampoo 180ml':     'पैंटीन शैम्पू 180 मिली',
  'pantene shampoo 340ml':     'पैंटीन शैम्पू 340 मिली',
  'dove shampoo 80ml':         'डव शैम्पू 80 मिली',
  'dove shampoo 180ml':        'डव शैम्पू 180 मिली',
  'dove shampoo 340ml':        'डव शैम्पू 340 मिली',
  'tresemme shampoo 80ml':     'ट्रेसेमे शैम्पू 80 मिली',
  'tresemme shampoo 180ml':    'ट्रेसेमे शैम्पू 180 मिली',
  'tresemme shampoo 340ml':    'ट्रेसेमे शैम्पू 340 मिली',
  'himalaya shampoo 80ml':     'हिमालया शैम्पू 80 मिली',
  'himalaya shampoo 180ml':    'हिमालया शैम्पू 180 मिली',
  'himalaya shampoo 340ml':    'हिमालया शैम्पू 340 मिली',
  'biotique shampoo 80ml':     'बायोटिक शैम्पू 80 मिली',
  'biotique shampoo 180ml':    'बायोटिक शैम्पू 180 मिली',
  'biotique shampoo 340ml':    'बायोटिक शैम्पू 340 मिली',
  'mamaearth onion shampoo 250ml': 'मामाअर्थ प्याज शैम्पू 250 मिली',
  'wow apple cider vinegar shampoo 300ml': 'वाउ एप्पल सिडर शैम्पू 300 मिली',

  // ── ORAL CARE ──────────────────────────────────────────────────────────────
  'colgate toothpaste 50g':    'कोलगेट टूथपेस्ट 50 ग्राम',
  'colgate toothpaste 100g':   'कोलगेट टूथपेस्ट 100 ग्राम',
  'colgate toothpaste 200g':   'कोलगेट टूथपेस्ट 200 ग्राम',
  'colgate charcoal toothpaste 120g': 'कोलगेट चारकोल पेस्ट 120 ग्राम',
  'pepsodent toothpaste 50g':  'पेप्सोडेंट टूथपेस्ट 50 ग्राम',
  'pepsodent toothpaste 100g': 'पेप्सोडेंट टूथपेस्ट 100 ग्राम',
  'close up toothpaste 50g':   'क्लोज अप पेस्ट 50 ग्राम',
  'close up toothpaste 100g':  'क्लोज अप पेस्ट 100 ग्राम',
  'dabur red toothpaste 50g':  'डाबर लाल पेस्ट 50 ग्राम',
  'dabur red toothpaste 100g': 'डाबर लाल पेस्ट 100 ग्राम',
  'sensodyne toothpaste 70g':  'सेंसोडाइन पेस्ट 70 ग्राम',
  'colgate mouthwash 250ml':   'कोलगेट माउथवॉश 250 मिली',
  'listerine mouthwash 250ml': 'लिस्टरीन माउथवॉश 250 मिली',
  'oral-b toothbrush':         'ओरल-बी टूथब्रश',
  'colgate 360 toothbrush':    'कोलगेट 360 टूथब्रश',
  'himalaya toothpaste 100g':  'हिमालया टूथपेस्ट 100 ग्राम',
  'patanjali dant kanti toothpaste 100g': 'पतंजलि दंत कांति पेस्ट 100 ग्राम',

  // ── HANDWASH ───────────────────────────────────────────────────────────────
  'dettol handwash 200ml':     'डेटॉल हैंडवॉश 200 मिली',
  'dettol handwash 500ml':     'डेटॉल हैंडवॉश 500 मिली',
  'lifebuoy handwash 200ml':   'लाइफबॉय हैंडवॉश 200 मिली',
  'lifebuoy handwash 500ml':   'लाइफबॉय हैंडवॉश 500 मिली',
  'savlon handwash 200ml':     'सेवलॉन हैंडवॉश 200 मिली',
  'himalaya handwash 250ml':   'हिमालया हैंडवॉश 250 मिली',
  'godrej protekt handwash 200ml': 'गोदरेज प्रोटेक्ट हैंडवॉश 200 मिली',
  'palmolive handwash 250ml':  'पामोलिव हैंडवॉश 250 मिली',
  'santoor gentle hand wash mild': 'संतूर हैंडवॉश',

  // ── FACE CREAMS ────────────────────────────────────────────────────────────
  'glow & lovely face cream 25g': 'ग्लो एंड लवली क्रीम 25 ग्राम',
  'glow & lovely face cream 50g': 'ग्लो एंड लवली क्रीम 50 ग्राम',
  "pond's cold cream 35g":     'पॉन्ड्स कोल्ड क्रीम 35 ग्राम',
  "pond's cold cream 75g":     'पॉन्ड्स कोल्ड क्रीम 75 ग्राम',
  'nivea face cream 50ml':     'निविया फेस क्रीम 50 मिली',
  'nivea face cream 100ml':    'निविया फेस क्रीम 100 मिली',
  'lakme face cream 25g':      'लैक्मे फेस क्रीम 25 ग्राम',
  'himalaya face cream 50g':   'हिमालया फेस क्रीम 50 ग्राम',
  'olay total effects cream 50g': 'ओले टोटल इफेक्ट्स क्रीम 50 ग्राम',
  'garnier skin naturals cream 45g': 'गार्नियर स्किन क्रीम 45 ग्राम',
  'emami fair & handsome cream 30g': 'इमामी फेयर एंड हैंडसम क्रीम 30 ग्राम',

  // ── HAIR OIL ───────────────────────────────────────────────────────────────
  'parachute coconut oil 100ml': 'पैराशूट नारियल तेल 100 मिली',
  'parachute coconut oil 200ml': 'पैराशूट नारियल तेल 200 मिली',
  'parachute coconut oil 500ml': 'पैराशूट नारियल तेल 500 मिली',
  'dabur amla hair oil 100ml': 'डाबर आंवला तेल 100 मिली',
  'dabur amla hair oil 200ml': 'डाबर आंवला तेल 200 मिली',
  'bajaj almond hair oil 100ml': 'बजाज बादाम तेल 100 मिली',
  'bajaj almond hair oil 200ml': 'बजाज बादाम तेल 200 मिली',
  'vatika hair oil 100ml':     'वाटिका बाल तेल 100 मिली',
  'vatika hair oil 200ml':     'वाटिका बाल तेल 200 मिली',
  'nihar naturals hair oil 100ml': 'निहार नेचुरल्स तेल 100 मिली',
  'nihar naturals hair oil 200ml': 'निहार नेचुरल्स तेल 200 मिली',
  'kesh king hair oil 100ml':  'केश किंग तेल 100 मिली',
  'indulekha bringha hair oil 100ml': 'इंदुलेखा भृंगा तेल 100 मिली',
  'himalaya anti-dandruff hair oil 100ml': 'हिमालया डैंड्रफ तेल 100 मिली',

  // ── POWDER ─────────────────────────────────────────────────────────────────
  "pond's talc powder 100g":   'पॉन्ड्स टैल्क पाउडर 100 ग्राम',
  "pond's talc powder 200g":   'पॉन्ड्स टैल्क पाउडर 200 ग्राम',
  "johnson's baby powder 100g": 'जॉनसन बेबी पाउडर 100 ग्राम',
  "johnson's baby powder 200g": 'जॉनसन बेबी पाउडर 200 ग्राम',
  'nycil prickly heat powder 100g': 'नाइसिल पाउडर 100 ग्राम',
  'nycil prickly heat powder 150g': 'नाइसिल पाउडर 150 ग्राम',
  'boroplus prickly heat powder 100g': 'बोरोप्लस पाउडर 100 ग्राम',

  // ── MOISTURISERS ───────────────────────────────────────────────────────────
  'vaseline body lotion 50ml':  'वैसलीन बॉडी लोशन 50 मिली',
  'vaseline body lotion 100ml': 'वैसलीन बॉडी लोशन 100 मिली',
  'nivea body lotion 100ml':    'निविया बॉडी लोशन 100 मिली',
  'nivea body lotion 200ml':    'निविया बॉडी लोशन 200 मिली',
  'parachute advansed body lotion 100ml': 'पैराशूट एडवांस्ड लोशन 100 मिली',
  'himalaya body lotion 100ml': 'हिमालया बॉडी लोशन 100 मिली',
  'cetaphil moisturising lotion 100ml': 'सेटाफिल मॉइस्चराइजर 100 मिली',
  'lakme peach milk moisturiser 60ml': 'लैक्मे पीच मिल्क क्रीम 60 मिली',
  'biotique bio coconut whitening lotion 190ml': 'बायोटिक नारियल लोशन 190 मिली',

  // ── GROOMING ───────────────────────────────────────────────────────────────
  'gillette mach3 razor':      'जिलेट मैक3 रेजर',
  'gillette fusion razor':     'जिलेट फ्यूजन रेजर',
  'gillette guard razor':      'जिलेट गार्ड रेजर',
  'veet hair removal cream 25g': 'वीट हेयर रिमूवल क्रीम 25 ग्राम',
  'veet hair removal cream 50g': 'वीट हेयर रिमूवल क्रीम 50 ग्राम',
  'gillette shaving gel 60g':  'जिलेट शेविंग जेल 60 ग्राम',
  'park avenue shaving cream 70g': 'पार्क एवेन्यू शेविंग क्रीम 70 ग्राम',
  'old spice aftershave 50ml': 'ओल्ड स्पाइस आफ्टरशेव 50 मिली',
  'axe deodorant 150ml':       'एक्स डियो 150 मिली',
  'fogg deodorant 120ml':      'फॉग डियो 120 मिली',
  'wild stone deodorant 150ml':'वाइल्ड स्टोन डियो 150 मिली',
  'engage deodorant 150ml':    'एंगेज डियो 150 मिली',
  'denver deodorant 165ml':    'डेनवर डियो 165 मिली',
  'nivea men deodorant 150ml': 'निविया मेन डियो 150 मिली',
};

function getHindiName(name) {
  const lower = name.toLowerCase().trim();
  // Exact match first
  if (HINDI_NAMES[lower]) return HINDI_NAMES[lower];
  // Partial match
  for (const [key, hindi] of Object.entries(HINDI_NAMES)) {
    if (lower === key) return hindi;
  }
  return null;
}

async function main() {
  console.log('📦 Fetching products with garbled/missing Hindi names…');
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', SHOP_ID)));
  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => !p.localName || p.localName.includes('?'));

  console.log(`   Found ${products.length} products needing Hindi names\n`);

  let updated = 0, notFound = 0;

  for (const { id, name } of products) {
    const hindi = getHindiName(name);
    if (!hindi) {
      console.log(`❌ No Hindi for: ${name}`);
      notFound++;
      continue;
    }
    await updateDoc(doc(db, 'products', id), { localName: hindi });
    console.log(`✅ ${name} → ${hindi}`);
    updated++;
  }

  console.log(`\n✅ Updated: ${updated} | ❌ Not found: ${notFound}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
