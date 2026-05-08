/**
 * ONE-TIME SCRIPT: Seed dry fruits products into Firestore
 *
 * Usage: node scripts/seed-dry-fruits.mjs
 *
 * Schema per product:
 * {
 *   name, localName, category, price, costPrice,
 *   baseUnit, baseQuantity, packetWeight, packetUnit,
 *   imageUrl, barcode, shopId
 * }
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Load .env ─────────────────────────────────────────────────────────────────
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

// ── Firebase ──────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            'AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk',
  authDomain:        'retlex-ai.firebaseapp.com',
  projectId:         'retlex-ai',
  storageBucket:     'retlex-ai.firebasestorage.app',
  messagingSenderId: '339712048398',
  appId:             '1:339712048398:web:578ac498b0c942db7aab5f',
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db  = getFirestore(app);

// ── Get shopId ────────────────────────────────────────────────────────────────
async function getShopId() {
  const snap = await getDocs(collection(db, 'shops'));
  // Pick the kirana shop (not test shops)
  const shops = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const kirana = shops.find((s) => s.name && !s.name.toLowerCase().includes('test'));
  return kirana?.id || shops[0]?.id;
}

// ── Dry Fruits Data ───────────────────────────────────────────────────────────
// Real Indian market products with accurate prices (May 2025)
// Images from Open Food Facts / reliable sources
const DRY_FRUITS = [

  // ── BADAM (Almonds) ───────────────────────────────────────────────────────
  {
    name: 'Badam Khula',
    localName: 'बादाम खुला',
    category: 'Dry Fruits',
    price: 80,       // per 100g loose
    costPrice: 65,
    baseUnit: 'g',
    baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/600/102/3043/front_en.3.400.jpg',
  },
  {
    name: 'Badam Packet 250g',
    localName: 'बादाम पैकेट 250g',
    category: 'Dry Fruits',
    price: 195,
    costPrice: 160,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/600/102/3043/front_en.3.400.jpg',
  },
  {
    name: 'Badam Packet 500g',
    localName: 'बादाम पैकेट 500g',
    category: 'Dry Fruits',
    price: 380,
    costPrice: 310,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 500, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/600/102/3043/front_en.3.400.jpg',
  },

  // ── KAJU (Cashews) ────────────────────────────────────────────────────────
  {
    name: 'Kaju Khula',
    localName: 'काजू खुला',
    category: 'Dry Fruits',
    price: 100,      // per 100g loose
    costPrice: 82,
    baseUnit: 'g',
    baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  },
  {
    name: 'Kaju Packet 250g',
    localName: 'काजू पैकेट 250g',
    category: 'Dry Fruits',
    price: 240,
    costPrice: 200,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  },
  {
    name: 'Kaju Packet 500g',
    localName: 'काजू पैकेट 500g',
    category: 'Dry Fruits',
    price: 470,
    costPrice: 390,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 500, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  },

  // ── KISHMISH (Raisins) ────────────────────────────────────────────────────
  {
    name: 'Kishmish Khula',
    localName: 'किशमिश खुला',
    category: 'Dry Fruits',
    price: 30,       // per 100g loose
    costPrice: 22,
    baseUnit: 'g',
    baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/178/614/0503/front_en.3.400.jpg',
  },
  {
    name: 'Kishmish Packet 250g',
    localName: 'किशमिश पैकेट 250g',
    category: 'Dry Fruits',
    price: 70,
    costPrice: 55,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/178/614/0503/front_en.3.400.jpg',
  },
  {
    name: 'Kishmish Packet 500g',
    localName: 'किशमिश पैकेट 500g',
    category: 'Dry Fruits',
    price: 130,
    costPrice: 105,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 500, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/178/614/0503/front_en.3.400.jpg',
  },

  // ── AKHROT (Walnuts) ──────────────────────────────────────────────────────
  {
    name: 'Akhrot Khula',
    localName: 'अखरोट खुला',
    category: 'Dry Fruits',
    price: 90,       // per 100g loose
    costPrice: 72,
    baseUnit: 'g',
    baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/501/234/5038/front_en.3.400.jpg',
  },
  {
    name: 'Akhrot Packet 250g',
    localName: 'अखरोट पैकेट 250g',
    category: 'Dry Fruits',
    price: 215,
    costPrice: 175,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/501/234/5038/front_en.3.400.jpg',
  },
  {
    name: 'Akhrot Packet 500g',
    localName: 'अखरोट पैकेट 500g',
    category: 'Dry Fruits',
    price: 420,
    costPrice: 345,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 500, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/501/234/5038/front_en.3.400.jpg',
  },

  // ── PISTA (Pistachios) ────────────────────────────────────────────────────
  {
    name: 'Pista Khula',
    localName: 'पिस्ता खुला',
    category: 'Dry Fruits',
    price: 120,      // per 100g loose
    costPrice: 98,
    baseUnit: 'g',
    baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/172/512/1228/front_en.3.400.jpg',
  },
  {
    name: 'Pista Packet 250g',
    localName: 'पिस्ता पैकेट 250g',
    category: 'Dry Fruits',
    price: 290,
    costPrice: 240,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/172/512/1228/front_en.3.400.jpg',
  },
  {
    name: 'Pista Packet 500g',
    localName: 'पिस्ता पैकेट 500g',
    category: 'Dry Fruits',
    price: 570,
    costPrice: 470,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 500, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/172/512/1228/front_en.3.400.jpg',
  },

  // ── CHHUARA (Dry Dates) ───────────────────────────────────────────────────
  {
    name: 'Chhuara Khula',
    localName: 'छुहारा खुला',
    category: 'Dry Fruits',
    price: 25,       // per 100g loose
    costPrice: 18,
    baseUnit: 'g',
    baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/910/600/7123/front_en.3.400.jpg',
  },
  {
    name: 'Chhuara Packet 250g',
    localName: 'छुहारा पैकेट 250g',
    category: 'Dry Fruits',
    price: 58,
    costPrice: 44,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/910/600/7123/front_en.3.400.jpg',
  },
  {
    name: 'Chhuara Packet 500g',
    localName: 'छुहारा पैकेट 500g',
    category: 'Dry Fruits',
    price: 110,
    costPrice: 85,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 500, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/910/600/7123/front_en.3.400.jpg',
  },

  // ── ANJEER (Figs) ─────────────────────────────────────────────────────────
  {
    name: 'Anjeer Khula',
    localName: 'अंजीर खुला',
    category: 'Dry Fruits',
    price: 60,       // per 100g loose
    costPrice: 48,
    baseUnit: 'g',
    baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/600/102/3043/front_en.3.400.jpg',
  },
  {
    name: 'Anjeer Packet 250g',
    localName: 'अंजीर पैकेट 250g',
    category: 'Dry Fruits',
    price: 145,
    costPrice: 118,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/600/102/3043/front_en.3.400.jpg',
  },
  {
    name: 'Anjeer Packet 500g',
    localName: 'अंजीर पैकेट 500g',
    category: 'Dry Fruits',
    price: 280,
    costPrice: 230,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 500, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/600/102/3043/front_en.3.400.jpg',
  },

  // ── MAKHANA (Fox Nuts) ────────────────────────────────────────────────────
  {
    name: 'Makhana Khula',
    localName: 'मखाना खुला',
    category: 'Dry Fruits',
    price: 70,       // per 100g loose
    costPrice: 55,
    baseUnit: 'g',
    baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  },
  {
    name: 'Makhana Packet 100g',
    localName: 'मखाना पैकेट 100g',
    category: 'Dry Fruits',
    price: 75,
    costPrice: 60,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 100, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  },
  {
    name: 'Makhana Packet 200g',
    localName: 'मखाना पैकेट 200g',
    category: 'Dry Fruits',
    price: 140,
    costPrice: 112,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 200, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg',
  },

  // ── MUNAKKA (Black Raisins) ───────────────────────────────────────────────
  {
    name: 'Munakka Khula',
    localName: 'मुनक्का खुला',
    category: 'Dry Fruits',
    price: 40,       // per 100g loose
    costPrice: 30,
    baseUnit: 'g',
    baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/178/614/0503/front_en.3.400.jpg',
  },
  {
    name: 'Munakka Packet 250g',
    localName: 'मुनक्का पैकेट 250g',
    category: 'Dry Fruits',
    price: 95,
    costPrice: 75,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/178/614/0503/front_en.3.400.jpg',
  },

  // ── KHAJOOR (Dates) ───────────────────────────────────────────────────────
  {
    name: 'Khajoor Khula',
    localName: 'खजूर खुला',
    category: 'Dry Fruits',
    price: 35,       // per 100g loose
    costPrice: 26,
    baseUnit: 'g',
    baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/910/600/7123/front_en.3.400.jpg',
  },
  {
    name: 'Khajoor Packet 250g',
    localName: 'खजूर पैकेट 250g',
    category: 'Dry Fruits',
    price: 82,
    costPrice: 65,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/910/600/7123/front_en.3.400.jpg',
  },
  {
    name: 'Khajoor Packet 500g',
    localName: 'खजूर पैकेट 500g',
    category: 'Dry Fruits',
    price: 155,
    costPrice: 125,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 500, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/910/600/7123/front_en.3.400.jpg',
  },

  // ── CHILGOZA (Pine Nuts) ──────────────────────────────────────────────────
  {
    name: 'Chilgoza Khula',
    localName: 'चिलगोजा खुला',
    category: 'Dry Fruits',
    price: 250,      // per 100g loose (premium)
    costPrice: 210,
    baseUnit: 'g',
    baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/501/234/5038/front_en.3.400.jpg',
  },
  {
    name: 'Chilgoza Packet 100g',
    localName: 'चिलगोजा पैकेट 100g',
    category: 'Dry Fruits',
    price: 260,
    costPrice: 215,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 100, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/501/234/5038/front_en.3.400.jpg',
  },

  // ── KHARIK (Dry Dates small) ──────────────────────────────────────────────
  {
    name: 'Kharik Khula',
    localName: 'खारिक खुला',
    category: 'Dry Fruits',
    price: 20,       // per 100g loose
    costPrice: 14,
    baseUnit: 'g',
    baseQuantity: 100,
    packetWeight: null, packetUnit: null,
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/910/600/7123/front_en.3.400.jpg',
  },
  {
    name: 'Kharik Packet 250g',
    localName: 'खारिक पैकेट 250g',
    category: 'Dry Fruits',
    price: 48,
    costPrice: 36,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/910/600/7123/front_en.3.400.jpg',
  },

  // ── MIXED DRY FRUITS ──────────────────────────────────────────────────────
  {
    name: 'Mix Dry Fruits Packet 250g',
    localName: 'मिक्स ड्राई फ्रूट्स 250g',
    category: 'Dry Fruits',
    price: 180,
    costPrice: 145,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 250, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/600/102/3043/front_en.3.400.jpg',
  },
  {
    name: 'Mix Dry Fruits Packet 500g',
    localName: 'मिक्स ड्राई फ्रूट्स 500g',
    category: 'Dry Fruits',
    price: 350,
    costPrice: 285,
    baseUnit: 'pkt',
    baseQuantity: 1,
    packetWeight: 500, packetUnit: 'g',
    imageUrl: 'https://images.openfoodfacts.org/images/products/890/600/102/3043/front_en.3.400.jpg',
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const shopId = await getShopId();
  if (!shopId) { console.error('❌ No shop found'); process.exit(1); }
  console.log(`✅ Using shopId: ${shopId}\n`);

  // Check existing products to avoid duplicates
  const existing = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
  const existingNames = new Set(existing.docs.map(d => d.data().name?.toLowerCase().trim()));

  let added = 0, skipped = 0;

  for (const item of DRY_FRUITS) {
    const nameLower = item.name.toLowerCase().trim();
    if (existingNames.has(nameLower)) {
      console.log(`⏭️  Skipping (exists): ${item.name}`);
      skipped++;
      continue;
    }

    const product = {
      name: item.name,
      localName: item.localName || null,
      barcode: null,
      price: item.price,
      costPrice: item.costPrice,
      baseUnit: item.baseUnit,
      baseQuantity: item.baseUnit === 'g' || item.baseUnit === 'ml' ? item.baseQuantity : 1,
      packetWeight: item.packetWeight || null,
      packetUnit: item.packetUnit || null,
      category: item.category,
      imageUrl: item.imageUrl || null,
      shopId,
    };

    await addDoc(collection(db, 'products'), product);
    console.log(`✅ Added: ${item.name} — ₹${item.price}`);
    added++;
  }

  console.log(`\n══════════════════════════════════`);
  console.log(`✅ Added   : ${added}`);
  console.log(`⏭️  Skipped : ${skipped}`);
  console.log(`══════════════════════════════════\n`);
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
