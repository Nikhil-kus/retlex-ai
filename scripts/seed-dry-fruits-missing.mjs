/**
 * Add missing dry fruits from the image
 * Usage: node scripts/seed-dry-fruits-missing.mjs
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, query, where } from 'firebase/firestore';
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

// All missing dry fruits from the image with real Wikipedia images
const MISSING_DRY_FRUITS = [

  // ── KHUBANI (Apricot) ─────────────────────────────────────────────────────
  {
    name: 'Khubani Khula',
    localName: 'खुबानी खुला',
    price: 45, costPrice: 34,
    baseUnit: 'g', baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Apricot_and_cross_section.jpg/320px-Apricot_and_cross_section.jpg',
  },
  {
    name: 'Khubani Packet 250g',
    localName: 'खुबानी पैकेट 250g',
    price: 105, costPrice: 82,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Apricot_and_cross_section.jpg/320px-Apricot_and_cross_section.jpg',
  },
  {
    name: 'Khubani Packet 500g',
    localName: 'खुबानी पैकेट 500g',
    price: 200, costPrice: 158,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 500, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Apricot_and_cross_section.jpg/320px-Apricot_and_cross_section.jpg',
  },

  // ── MISHRI (Sugar Candy / Rock Sugar) ────────────────────────────────────
  {
    name: 'Mishri Khula',
    localName: 'मिश्री खुला',
    price: 15, costPrice: 10,
    baseUnit: 'g', baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Rock_candy_in_glass.jpg/320px-Rock_candy_in_glass.jpg',
  },
  {
    name: 'Mishri Packet 250g',
    localName: 'मिश्री पैकेट 250g',
    price: 35, costPrice: 25,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Rock_candy_in_glass.jpg/320px-Rock_candy_in_glass.jpg',
  },
  {
    name: 'Mishri Packet 500g',
    localName: 'मिश्री पैकेट 500g',
    price: 65, costPrice: 48,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 500, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Rock_candy_in_glass.jpg/320px-Rock_candy_in_glass.jpg',
  },

  // ── SOYABEAN KE BEEJ (Soy Nuts) ──────────────────────────────────────────
  {
    name: 'Soyabean Khula',
    localName: 'सोयाबीन के बीज खुला',
    price: 12, costPrice: 8,
    baseUnit: 'g', baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Soybean_seeds.jpg/320px-Soybean_seeds.jpg',
  },
  {
    name: 'Soyabean Packet 250g',
    localName: 'सोयाबीन पैकेट 250g',
    price: 28, costPrice: 20,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Soybean_seeds.jpg/320px-Soybean_seeds.jpg',
  },
  {
    name: 'Soyabean Packet 500g',
    localName: 'सोयाबीन पैकेट 500g',
    price: 52, costPrice: 38,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 500, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Soybean_seeds.jpg/320px-Soybean_seeds.jpg',
  },

  // ── SUPARI (Betel Nut) ────────────────────────────────────────────────────
  {
    name: 'Supari Khula',
    localName: 'सुपारी खुला',
    price: 20, costPrice: 14,
    baseUnit: 'g', baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Areca_catechu_fruits.jpg/320px-Areca_catechu_fruits.jpg',
  },
  {
    name: 'Supari Packet 100g',
    localName: 'सुपारी पैकेट 100g',
    price: 22, costPrice: 16,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 100, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Areca_catechu_fruits.jpg/320px-Areca_catechu_fruits.jpg',
  },
  {
    name: 'Supari Packet 250g',
    localName: 'सुपारी पैकेट 250g',
    price: 50, costPrice: 36,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Areca_catechu_fruits.jpg/320px-Areca_catechu_fruits.jpg',
  },

  // ── SUKHI AADU / SHAHBALUT (Dry Peach / Chestnut) ────────────────────────
  {
    name: 'Sukhi Aadu Khula',
    localName: 'सूखी आड़ू खुला',
    price: 35, costPrice: 26,
    baseUnit: 'g', baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Dried_peaches.jpg/320px-Dried_peaches.jpg',
  },
  {
    name: 'Sukhi Aadu Packet 250g',
    localName: 'सूखी आड़ू पैकेट 250g',
    price: 82, costPrice: 62,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Dried_peaches.jpg/320px-Dried_peaches.jpg',
  },

  // ── KHOPRA (Dry Coconut) ──────────────────────────────────────────────────
  {
    name: 'Khopra Khula',
    localName: 'खोपरा खुला',
    price: 18, costPrice: 12,
    baseUnit: 'g', baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Coconut_on_white_background.jpg/320px-Coconut_on_white_background.jpg',
  },
  {
    name: 'Khopra Packet 250g',
    localName: 'खोपरा पैकेट 250g',
    price: 42, costPrice: 30,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Coconut_on_white_background.jpg/320px-Coconut_on_white_background.jpg',
  },
  {
    name: 'Khopra Packet 500g',
    localName: 'खोपरा पैकेट 500g',
    price: 80, costPrice: 58,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 500, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Coconut_on_white_background.jpg/320px-Coconut_on_white_background.jpg',
  },

  // ── SUKHI KIWI (Dry Kiwi) ─────────────────────────────────────────────────
  {
    name: 'Sukhi Kiwi Khula',
    localName: 'सूखी कीवी खुला',
    price: 55, costPrice: 42,
    baseUnit: 'g', baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Kiwi_as_food.jpg/320px-Kiwi_as_food.jpg',
  },
  {
    name: 'Sukhi Kiwi Packet 100g',
    localName: 'सूखी कीवी पैकेट 100g',
    price: 58, costPrice: 44,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 100, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Kiwi_as_food.jpg/320px-Kiwi_as_food.jpg',
  },
  {
    name: 'Sukhi Kiwi Packet 200g',
    localName: 'सूखी कीवी पैकेट 200g',
    price: 110, costPrice: 84,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 200, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Kiwi_as_food.jpg/320px-Kiwi_as_food.jpg',
  },

  // ── CRANBERRY ─────────────────────────────────────────────────────────────
  {
    name: 'Cranberry Khula',
    localName: 'क्रैनबेरी खुला',
    price: 65, costPrice: 50,
    baseUnit: 'g', baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Cranberry_whole_fruit.jpg/320px-Cranberry_whole_fruit.jpg',
  },
  {
    name: 'Cranberry Packet 100g',
    localName: 'क्रैनबेरी पैकेट 100g',
    price: 68, costPrice: 52,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 100, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Cranberry_whole_fruit.jpg/320px-Cranberry_whole_fruit.jpg',
  },
  {
    name: 'Cranberry Packet 200g',
    localName: 'क्रैनबेरी पैकेट 200g',
    price: 130, costPrice: 100,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 200, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Cranberry_whole_fruit.jpg/320px-Cranberry_whole_fruit.jpg',
  },

  // ── KESAR (Saffron) ───────────────────────────────────────────────────────
  {
    name: 'Kesar Khula',
    localName: 'केसर खुला',
    price: 350, costPrice: 290,
    baseUnit: 'g', baseQuantity: 1,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Saffron_crocus.jpg/320px-Saffron_crocus.jpg',
  },
  {
    name: 'Kesar Packet 1g',
    localName: 'केसर पैकेट 1g',
    price: 380, costPrice: 310,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 1, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Saffron_crocus.jpg/320px-Saffron_crocus.jpg',
  },
  {
    name: 'Kesar Packet 2g',
    localName: 'केसर पैकेट 2g',
    price: 720, costPrice: 590,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 2, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Saffron_crocus.jpg/320px-Saffron_crocus.jpg',
  },

  // ── SUKHA ALUBUKHARA (Prune) ──────────────────────────────────────────────
  {
    name: 'Alubukhara Khula',
    localName: 'सूखा आलूबुखारा खुला',
    price: 30, costPrice: 22,
    baseUnit: 'g', baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Prunes_dried_plums.jpg/320px-Prunes_dried_plums.jpg',
  },
  {
    name: 'Alubukhara Packet 250g',
    localName: 'आलूबुखारा पैकेट 250g',
    price: 72, costPrice: 54,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Prunes_dried_plums.jpg/320px-Prunes_dried_plums.jpg',
  },
  {
    name: 'Alubukhara Packet 500g',
    localName: 'आलूबुखारा पैकेट 500g',
    price: 138, costPrice: 105,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 500, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Prunes_dried_plums.jpg/320px-Prunes_dried_plums.jpg',
  },

  // ── KHASKHAS (Poppy Seeds) ────────────────────────────────────────────────
  {
    name: 'Khaskhas Khula',
    localName: 'खसखस खुला',
    price: 25, costPrice: 18,
    baseUnit: 'g', baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Poppy_seeds.jpg/320px-Poppy_seeds.jpg',
  },
  {
    name: 'Khaskhas Packet 100g',
    localName: 'खसखस पैकेट 100g',
    price: 28, costPrice: 20,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 100, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Poppy_seeds.jpg/320px-Poppy_seeds.jpg',
  },
  {
    name: 'Khaskhas Packet 250g',
    localName: 'खसखस पैकेट 250g',
    price: 62, costPrice: 46,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Poppy_seeds.jpg/320px-Poppy_seeds.jpg',
  },

  // ── TIL KE BEEJ (Sesame Seeds) ────────────────────────────────────────────
  {
    name: 'Til Khula',
    localName: 'तिल के बीज खुला',
    price: 15, costPrice: 10,
    baseUnit: 'g', baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Sesame_seeds.jpg/320px-Sesame_seeds.jpg',
  },
  {
    name: 'Til Packet 250g',
    localName: 'तिल पैकेट 250g',
    price: 35, costPrice: 25,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Sesame_seeds.jpg/320px-Sesame_seeds.jpg',
  },
  {
    name: 'Til Packet 500g',
    localName: 'तिल पैकेट 500g',
    price: 65, costPrice: 48,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 500, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Sesame_seeds.jpg/320px-Sesame_seeds.jpg',
  },

  // ── KALA AKHROT (Black Walnut) ────────────────────────────────────────────
  {
    name: 'Kala Akhrot Khula',
    localName: 'काला अखरोट खुला',
    price: 110, costPrice: 88,
    baseUnit: 'g', baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Walnuts_-_whole_and_open.jpg/320px-Walnuts_-_whole_and_open.jpg',
  },
  {
    name: 'Kala Akhrot Packet 250g',
    localName: 'काला अखरोट पैकेट 250g',
    price: 265, costPrice: 215,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Walnuts_-_whole_and_open.jpg/320px-Walnuts_-_whole_and_open.jpg',
  },
  {
    name: 'Kala Akhrot Packet 500g',
    localName: 'काला अखरोट पैकेट 500g',
    price: 520, costPrice: 420,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 500, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Walnuts_-_whole_and_open.jpg/320px-Walnuts_-_whole_and_open.jpg',
  },

  // ── SURAJMUKHI KE BEEJ (Sunflower Seeds) ─────────────────────────────────
  {
    name: 'Surajmukhi Beej Khula',
    localName: 'सूरजमुखी के बीज खुला',
    price: 12, costPrice: 8,
    baseUnit: 'g', baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Sunflower_seeds.jpg/320px-Sunflower_seeds.jpg',
  },
  {
    name: 'Surajmukhi Beej Packet 250g',
    localName: 'सूरजमुखी बीज पैकेट 250g',
    price: 28, costPrice: 20,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Sunflower_seeds.jpg/320px-Sunflower_seeds.jpg',
  },
  {
    name: 'Surajmukhi Beej Packet 500g',
    localName: 'सूरजमुखी बीज पैकेट 500g',
    price: 52, costPrice: 38,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 500, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Sunflower_seeds.jpg/320px-Sunflower_seeds.jpg',
  },

  // ── BRAZIL NUT (Trikonphal) ───────────────────────────────────────────────
  {
    name: 'Brazil Nut Khula',
    localName: 'त्रिकोणफल खुला',
    price: 150, costPrice: 120,
    baseUnit: 'g', baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Brazil_nuts.jpg/320px-Brazil_nuts.jpg',
  },
  {
    name: 'Brazil Nut Packet 100g',
    localName: 'त्रिकोणफल पैकेट 100g',
    price: 158, costPrice: 126,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 100, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Brazil_nuts.jpg/320px-Brazil_nuts.jpg',
  },
  {
    name: 'Brazil Nut Packet 250g',
    localName: 'त्रिकोणफल पैकेट 250g',
    price: 368, costPrice: 295,
    baseUnit: 'pkt', baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Brazil_nuts.jpg/320px-Brazil_nuts.jpg',
  },
];

async function main() {
  console.log('📦 Adding missing dry fruits to shop:', SHOP_ID);

  // Get existing product names to avoid duplicates
  const existingSnap = await getDocs(query(collection(db, 'products'), where('shopId', '==', SHOP_ID)));
  const existingNames = new Set(existingSnap.docs.map(d => d.data().name?.toLowerCase().trim()));

  let added = 0, skipped = 0;

  for (const item of MISSING_DRY_FRUITS) {
    if (existingNames.has(item.name.toLowerCase().trim())) {
      console.log(`⏭️  Skip: ${item.name}`);
      skipped++;
      continue;
    }

    await addDoc(collection(db, 'products'), {
      name: item.name,
      localName: item.localName || null,
      barcode: null,
      price: item.price,
      costPrice: item.costPrice,
      baseUnit: item.baseUnit,
      baseQuantity: item.baseUnit === 'g' || item.baseUnit === 'ml' ? item.baseQuantity : 1,
      packetWeight: item.packetWeight || null,
      packetUnit: item.packetUnit || null,
      category: 'Dry Fruits',
      imageUrl: item.imageUrl,
      shopId: SHOP_ID,
    });
    console.log(`✅ Added: ${item.name} — ₹${item.price}`);
    added++;
  }

  console.log(`\n✅ Added: ${added} | ⏭️ Skipped: ${skipped}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
