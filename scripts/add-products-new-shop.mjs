/**
 * Adds products identified from the uploaded images into the most recently
 * created shop in Firestore.
 *
 * Products identified from images:
 * 1. Pearly Mazic Disinfectant Concentrate 200ml — ₹75 (MRP ₹99)
 * 2. Oura Air Freshener Floral Bouquet — ₹pc
 * 3. Arbuda Fytox Cypermethrin Dusting Powder 100g — ₹pc
 * 4. KamaSutra Spark Deodorant Spray 120ml — ₹99
 * 5. Jantu Nashak Powder (Extra Power) — ₹pc
 * 6. JD Air Freshener Lemon 250ml — ₹pc
 * 7. Mortein PowerGard Rat Kill Cake — ₹pc
 * 8. Arbuda Run-Rat Rodenticide 25g — ₹pc
 * 9. Arbuda Rat Bait Zinc Phosphide 50g — ₹50
 * 10. PCI Trubble Gum Rat Trap — ₹pc
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
  storageBucket: "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId: "1:339712048398:web:578ac498b0c942db7aab5f",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// ── Step 1: Find the most recently created shop ──────────────────────────────
async function getNewestShop() {
  const snap = await getDocs(collection(db, 'shops'));
  const shops = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (shops.length === 0) throw new Error('No shops found in Firestore');

  // Sort by createdAt descending; fall back to doc ID order if no createdAt
  shops.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return shops[0];
}

// ── Step 2: Product list from images ─────────────────────────────────────────
function buildProducts(shopId) {
  return [
    {
      name: 'Pearly Mazic Disinfectant Concentrate 200ml',
      localName: 'पर्ली मैजिक डिसइन्फेक्टेंट',
      price: 75,
      costPrice: 0,
      baseUnit: 'pc',
      baseQuantity: 1,
      packetWeight: 200,
      packetUnit: 'ml',
      category: 'Cleaning Products',
      barcode: '8906010040710',
      imageUrl: null,
      shopId,
    },
    {
      name: 'Oura Air Freshener Floral Bouquet',
      localName: 'ओरा एयर फ्रेशनर फ्लोरल बुके',
      price: 0,
      costPrice: 0,
      baseUnit: 'pc',
      baseQuantity: 1,
      packetWeight: null,
      packetUnit: null,
      category: 'Air Fresheners',
      barcode: null,
      imageUrl: null,
      shopId,
    },
    {
      name: 'Arbuda Fytox Dusting Powder 100g',
      localName: 'अर्बुदा फाइटॉक्स डस्टिंग पाउडर',
      price: 0,
      costPrice: 0,
      baseUnit: 'pc',
      baseQuantity: 1,
      packetWeight: 100,
      packetUnit: 'g',
      category: 'Pesticides',
      barcode: null,
      imageUrl: null,
      shopId,
    },
    {
      name: 'KamaSutra Spark Deodorant Spray 120ml',
      localName: 'कामसूत्र स्पार्क डियोड्रेंट स्प्रे',
      price: 99,
      costPrice: 0,
      baseUnit: 'pc',
      baseQuantity: 1,
      packetWeight: 120,
      packetUnit: 'ml',
      category: 'Personal Care',
      barcode: null,
      imageUrl: null,
      shopId,
    },
    {
      name: 'Jantu Nashak Powder Extra Power',
      localName: 'जन्तु नाशक पाउडर एक्स्ट्रा पावर',
      price: 0,
      costPrice: 0,
      baseUnit: 'pc',
      baseQuantity: 1,
      packetWeight: null,
      packetUnit: null,
      category: 'Pesticides',
      barcode: null,
      imageUrl: null,
      shopId,
    },
    {
      name: 'JD Air Freshener Lemon 250ml',
      localName: 'जेडी एयर फ्रेशनर लेमन',
      price: 0,
      costPrice: 0,
      baseUnit: 'pc',
      baseQuantity: 1,
      packetWeight: 250,
      packetUnit: 'ml',
      category: 'Air Fresheners',
      barcode: null,
      imageUrl: null,
      shopId,
    },
    {
      name: 'Mortein PowerGard Rat Kill Cake',
      localName: 'मोर्टेन रैट किल केक',
      price: 0,
      costPrice: 0,
      baseUnit: 'pc',
      baseQuantity: 1,
      packetWeight: null,
      packetUnit: null,
      category: 'Pesticides',
      barcode: null,
      imageUrl: null,
      shopId,
    },
    {
      name: 'Arbuda Run-Rat Rodenticide 25g',
      localName: 'अर्बुदा रन-रैट रोडेंटिसाइड',
      price: 0,
      costPrice: 0,
      baseUnit: 'pc',
      baseQuantity: 1,
      packetWeight: 25,
      packetUnit: 'g',
      category: 'Pesticides',
      barcode: null,
      imageUrl: null,
      shopId,
    },
    {
      name: 'Arbuda Rat Bait Zinc Phosphide 50g',
      localName: 'अर्बुदा रैट बेट जिंक फॉस्फाइड',
      price: 50,
      costPrice: 0,
      baseUnit: 'pc',
      baseQuantity: 1,
      packetWeight: 50,
      packetUnit: 'g',
      category: 'Pesticides',
      barcode: null,
      imageUrl: null,
      shopId,
    },
    {
      name: 'PCI Trubble Gum Rat Trap',
      localName: 'पीसीआई ट्रबल गम रैट ट्रैप',
      price: 0,
      costPrice: 0,
      baseUnit: 'pc',
      baseQuantity: 1,
      packetWeight: null,
      packetUnit: null,
      category: 'Pesticides',
      barcode: null,
      imageUrl: null,
      shopId,
    },
  ];
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Finding most recently created shop...');
  const shop = await getNewestShop();
  console.log(`✅ Target shop: "${shop.name}" (ID: ${shop.id})`);
  console.log(`   Created: ${shop.createdAt || 'unknown'}\n`);

  const products = buildProducts(shop.id);
  console.log(`📦 Adding ${products.length} products...\n`);

  for (const product of products) {
    try {
      const docRef = await addDoc(collection(db, 'products'), product);
      console.log(`  ✅ ${product.name} → ${docRef.id}`);
    } catch (err) {
      console.error(`  ❌ Failed: ${product.name}`, err.message);
    }
  }

  console.log('\n🎉 Done! All products added.');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
