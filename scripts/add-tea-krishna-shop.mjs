/**
 * add-tea-krishna-shop.mjs
 * Tea, green tea, health drinks, and related beverages — all with size variants.
 * Run: node scripts/add-tea-krishna-shop.mjs
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, query, where, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
  storageBucket: "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId: "1:339712048398:web:578ac498b0c942db7aab5f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PRODUCTS = [

  // ══════════════════════════════════════════════════════════════════
  // REGULAR CHAI PATTI (BLACK TEA / CTC)
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Brooke Bond Red Label Tea",
    localName: "ब्रुक बॉन्ड रेड लेबल चाय",
    brand: "Brooke Bond", category: "Beverages",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076540_9-brooke-bond-red-label-tea.jpg",
    variants: [
      { size: "100g",  price: 55,  costPrice: 48 },
      { size: "250g",  price: 125, costPrice: 109 },
      { size: "500g",  price: 240, costPrice: 210 },
      { size: "1kg",   price: 460, costPrice: 404 },
    ],
  },
  {
    baseName: "Wagh Bakri Premium Leaf Tea",
    localName: "वाघ बकरी प्रीमियम लीफ चाय",
    brand: "Wagh Bakri", category: "Beverages",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076541_8-wagh-bakri-premium-tea.jpg",
    variants: [
      { size: "100g",  price: 60,  costPrice: 52 },
      { size: "250g",  price: 140, costPrice: 122 },
      { size: "500g",  price: 265, costPrice: 232 },
      { size: "1kg",   price: 510, costPrice: 448 },
    ],
  },
  {
    baseName: "Brooke Bond Taaza Tea",
    localName: "ब्रुक बॉन्ड ताज़ा चाय",
    brand: "Brooke Bond", category: "Beverages",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076542_7-brooke-bond-taaza-tea.jpg",
    variants: [
      { size: "100g",  price: 45,  costPrice: 39 },
      { size: "250g",  price: 105, costPrice: 92 },
      { size: "500g",  price: 200, costPrice: 175 },
      { size: "1kg",   price: 385, costPrice: 338 },
    ],
  },
  {
    baseName: "Tata Tea Premium",
    localName: "टाटा टी प्रीमियम चाय",
    brand: "Tata Tea", category: "Beverages",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076543_6-tata-tea-premium.jpg",
    variants: [
      { size: "100g",  price: 55,  costPrice: 48 },
      { size: "250g",  price: 125, costPrice: 109 },
      { size: "500g",  price: 240, costPrice: 210 },
      { size: "1kg",   price: 460, costPrice: 404 },
    ],
  },
  {
    baseName: "Goodricke Chai CTC Leaf Tea",
    localName: "गुडरिक चाय सीटीसी लीफ",
    brand: "Goodricke", category: "Beverages",
    imageUrl: null,
    variants: [
      { size: "100g",  price: 50,  costPrice: 43 },
      { size: "250g",  price: 115, costPrice: 100 },
      { size: "500g",  price: 220, costPrice: 193 },
      { size: "1kg",   price: 420, costPrice: 369 },
    ],
  },
  {
    baseName: "Krishna KT Gold Tea",
    localName: "कृष्णा केटी गोल्ड चाय",
    brand: "Krishna", category: "Beverages",
    imageUrl: null,
    variants: [
      { size: "100g",  price: 45,  costPrice: 39 },
      { size: "250g",  price: 105, costPrice: 92 },
      { size: "500g",  price: 200, costPrice: 175 },
      { size: "1kg",   price: 380, costPrice: 334 },
    ],
  },
  {
    baseName: "Nandanvan Chai",
    localName: "नंदनवन चाय",
    brand: "Nandanvan", category: "Beverages",
    imageUrl: null,
    variants: [
      { size: "100g",  price: 40,  costPrice: 35 },
      { size: "250g",  price: 95,  costPrice: 83 },
      { size: "500g",  price: 180, costPrice: 158 },
    ],
  },
  {
    baseName: "Lal Chai",
    localName: "लाल चाय",
    brand: "Lal Chai", category: "Beverages",
    imageUrl: null,
    variants: [
      { size: "100g",  price: 35,  costPrice: 30 },
      { size: "250g",  price: 80,  costPrice: 70 },
      { size: "500g",  price: 155, costPrice: 136 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // GREEN TEA
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Lipton Green Tea",
    localName: "लिप्टन ग्रीन टी",
    brand: "Lipton", category: "Beverages",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076544_5-lipton-green-tea.jpg",
    variants: [
      { size: "25 Tea Bags",  price: 90,  costPrice: 79 },
      { size: "100 Tea Bags", price: 300, costPrice: 263 },
    ],
  },
  {
    baseName: "Girnar Green Tea Classic",
    localName: "गिरनार ग्रीन टी क्लासिक",
    brand: "Girnar", category: "Beverages",
    imageUrl: null,
    variants: [
      { size: "36 Tea Bags",  price: 120, costPrice: 105 },
    ],
  },
  {
    baseName: "Girnar Green Tea Ginger",
    localName: "गिरनार ग्रीन टी अदरक",
    brand: "Girnar", category: "Beverages",
    imageUrl: null,
    variants: [
      { size: "36 Tea Bags",  price: 120, costPrice: 105 },
    ],
  },
  {
    baseName: "Girnar Green Tea Jeera Lime",
    localName: "गिरनार ग्रीन टी जीरा नींबू",
    brand: "Girnar", category: "Beverages",
    imageUrl: null,
    variants: [
      { size: "36 Tea Bags",  price: 120, costPrice: 105 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // HEALTH DRINKS
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Bournvita Health Drink",
    localName: "बॉर्नविटा हेल्थ ड्रिंक",
    brand: "Cadbury", category: "Beverages",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076545_4-bournvita-health-drink.jpg",
    variants: [
      { size: "200g",  price: 130, costPrice: 114 },
      { size: "500g",  price: 295, costPrice: 259 },
      { size: "1kg",   price: 560, costPrice: 492 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // TANG (additional flavors seen in images)
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Tang Lemon Drink Mix",
    localName: "टैंग लेमन ड्रिंक मिक्स",
    brand: "Tang", category: "Beverages",
    imageUrl: null,
    variants: [
      { size: "50g",   price: 25,  costPrice: 21 },
      { size: "100g",  price: 45,  costPrice: 39 },
      { size: "500g",  price: 195, costPrice: 171 },
    ],
  },
  {
    baseName: "Tang Mango Drink Mix",
    localName: "टैंग मैंगो ड्रिंक मिक्स",
    brand: "Tang", category: "Beverages",
    imageUrl: null,
    variants: [
      { size: "50g",   price: 25,  costPrice: 21 },
      { size: "100g",  price: 45,  costPrice: 39 },
      { size: "500g",  price: 195, costPrice: 171 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // BADAM DRINK
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Simply Namaste Badam Drink",
    localName: "सिम्पली नमस्ते बादाम ड्रिंक",
    brand: "Simply Namaste", category: "Beverages",
    imageUrl: null,
    variants: [
      { size: "Single Sachet (25g)", price: 10,  costPrice: 8 },
      { size: "Strip (10 sachets)",  price: 90,  costPrice: 79 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // INSTANT SOUP
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Winn Sweet Corn Soup",
    localName: "विन स्वीट कॉर्न सूप",
    brand: "Winn", category: "Beverages",
    imageUrl: null,
    variants: [
      { size: "Single Sachet", price: 10,  costPrice: 8 },
      { size: "Pack of 10",    price: 90,  costPrice: 79 },
    ],
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Finding Shri Krishna Kirana shop...\n");

  const shopsSnap = await getDocs(collection(db, "shops"));
  let targetShop = null;
  for (const d of shopsSnap.docs) {
    if ((d.data().name || "").toLowerCase().includes("krishna")) {
      targetShop = { id: d.id, ...d.data() };
      break;
    }
  }
  if (!targetShop) { console.error("❌ Shop not found"); process.exit(1); }
  console.log(`✅ Found: ${targetShop.name} (${targetShop.id})\n`);

  const existingSnap = await getDocs(
    query(collection(db, "products"), where("shopId", "==", targetShop.id))
  );
  const existingNames = new Set(
    existingSnap.docs.map(d => (d.data().name || "").toLowerCase().trim())
  );
  console.log(`📦 Existing products: ${existingNames.size}\n`);

  let added = 0, skipped = 0;

  for (const product of PRODUCTS) {
    for (const variant of product.variants) {
      const productName = `${product.baseName} ${variant.size}`;
      const nameKey = productName.toLowerCase().trim();

      if (existingNames.has(nameKey)) {
        console.log(`  ⏭  SKIP: ${productName}`);
        skipped++;
        continue;
      }

      await addDoc(collection(db, "products"), {
        name: productName,
        localName: product.localName || null,
        brand: product.brand || null,
        category: product.category,
        price: variant.price,
        costPrice: variant.costPrice,
        baseUnit: "pc",
        baseQuantity: 1,
        packetWeight: null,
        packetUnit: null,
        imageUrl: product.imageUrl || null,
        shopId: targetShop.id,
        variant: variant.size,
        createdAt: new Date().toISOString(),
        source: "manual_ingest",
      });

      existingNames.add(nameKey);
      console.log(`  ✅ Added: ${productName} @ ₹${variant.price}`);
      added++;

      // Upsert smallest size to globalCatalog
      if (product.variants.indexOf(variant) === 0) {
        const gcId = `gc_${nameKey.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 60)}`;
        await setDoc(doc(db, "globalCatalog", gcId), {
          name: productName,
          localName: product.localName || null,
          brand: product.brand || null,
          category: product.category,
          baseUnit: "pc",
          baseQuantity: 1,
          price: variant.price,
          imageUrl: product.imageUrl || null,
          createdAt: new Date().toISOString(),
          sourceShopId: targetShop.id,
        }, { merge: true });
      }
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`✅ Done! Added: ${added} | Skipped: ${skipped}`);
  console.log(`📦 Total products in shop now: ${existingNames.size}`);
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
