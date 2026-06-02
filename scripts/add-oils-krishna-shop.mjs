/**
 * add-oils-krishna-shop.mjs
 * Cooking oils, mustard oils, vanaspati, and cleaning gel
 * identified from shop photos — with exact sizes from labels.
 * Run: node scripts/add-oils-krishna-shop.mjs
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
  // MUSTARD OIL (Kachi Ghani / Sarson Tel)
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Patanjali Kachi Ghani Mustard Oil",
    localName: "पतंजलि कच्ची घानी सरसों तेल",
    brand: "Patanjali", category: "Cooking Oil",
    variants: [
      { size: "200ml",  price: 45,   costPrice: 39 },
      { size: "500ml",  price: 105,  costPrice: 92 },
      { size: "1L",     price: 200,  costPrice: 175 },
      { size: "5L",     price: 950,  costPrice: 834 },
    ],
  },
  {
    baseName: "Hathi Brand Kacchi Ghani Mustard Oil",
    localName: "हाथी ब्रांड कच्ची घानी सरसों तेल",
    brand: "Hathi Brand", category: "Cooking Oil",
    variants: [
      { size: "500ml",  price: 140,  costPrice: 122 },  // MRP visible on label
      { size: "1L",     price: 265,  costPrice: 232 },
      { size: "2L",     price: 520,  costPrice: 456 },
    ],
  },
  {
    baseName: "Swadist Shudh Kachi Ghani Mustard Oil",
    localName: "स्वादिष्ट शुद्ध कच्ची घानी सरसों तेल",
    brand: "Swadist Shudh", category: "Cooking Oil",
    variants: [
      { size: "500ml",  price: 110,  costPrice: 96 },
      { size: "1L",     price: 200,  costPrice: 175 },  // MRP ₹200 visible on label
      { size: "2L",     price: 390,  costPrice: 342 },
    ],
  },
  {
    baseName: "Lal Gulab Kachi Ghani Mustard Oil",
    localName: "लाल गुलाब कच्ची घानी सरसों तेल",
    brand: "Lal Gulab", category: "Cooking Oil",
    variants: [
      { size: "200ml",  price: 52,   costPrice: 45 },   // MRP ₹52 visible on label
      { size: "500ml",  price: 120,  costPrice: 105 },
      { size: "1L",     price: 225,  costPrice: 197 },
    ],
  },
  {
    baseName: "Kriti Kachi Ghani Mustard Oil",
    localName: "कृति कच्ची घानी सरसों तेल",
    brand: "Kriti", category: "Cooking Oil",
    variants: [
      { size: "450ml",  price: 100,  costPrice: 87 },   // Net Qty 450ml visible on back label
      { size: "1L",     price: 210,  costPrice: 184 },
      { size: "2L",     price: 410,  costPrice: 360 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // GROUNDNUT OIL
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Dhara Filtered Groundnut Oil",
    localName: "धारा फिल्टर्ड मूंगफली तेल",
    brand: "Dhara", category: "Cooking Oil",
    variants: [
      { size: "1L",     price: 220,  costPrice: 193 },
      { size: "2L",     price: 430,  costPrice: 378 },
      { size: "5L",     price: 1050, costPrice: 921 },  // 5L jerry can visible
      { size: "15L Tin", price: 3000, costPrice: 2632 }, // bulk carton/tin visible
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // SOYABEAN OIL
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "ABIS Soyal Refined Soyabean Oil",
    localName: "एबीएस सोयल रिफाइंड सोयाबीन तेल",
    brand: "ABIS", category: "Cooking Oil",
    variants: [
      { size: "1L",     price: 130,  costPrice: 114 },
      { size: "2L",     price: 255,  costPrice: 224 },
      { size: "5L",     price: 620,  costPrice: 544 },  // large white jerry can visible
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // RICE BRAN OIL
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Fortune Rice Bran Health Oil",
    localName: "फॉर्च्यून राइस ब्रान हेल्थ ऑयल",
    brand: "Fortune", category: "Cooking Oil",
    variants: [
      { size: "1L",     price: 175,  costPrice: 153 },
      { size: "2L",     price: 340,  costPrice: 298 },
      { size: "5L",     price: 830,  costPrice: 728 },  // 5L jerry can visible
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // MULTI-SOURCE EDIBLE OIL
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Saffola Gold Multi-Source Edible Oil",
    localName: "सफोला गोल्ड मल्टी-सोर्स एडिबल ऑयल",
    brand: "Saffola", category: "Cooking Oil",
    variants: [
      { size: "1L",     price: 200,  costPrice: 175 },
      { size: "2L",     price: 390,  costPrice: 342 },
      { size: "5L",     price: 950,  costPrice: 834 },  // 5L jerry can visible
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // SESAME OIL (Til Ka Tel)
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Tiloni Til Ka Tel (Sesame Oil)",
    localName: "तिलोनी तिल का तेल",
    brand: "Tiloni", category: "Cooking Oil",
    variants: [
      { size: "200ml",  price: 80,   costPrice: 70 },
      { size: "500ml",  price: 185,  costPrice: 162 },  // 500ml bottles visible
      { size: "1L",     price: 355,  costPrice: 311 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // VANASPATI
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Dalda Vanaspati",
    localName: "डालडा वनस्पति",
    brand: "Dalda", category: "Cooking Oil",
    variants: [
      { size: "500g",   price: 90,   costPrice: 79 },
      { size: "1kg",    price: 170,  costPrice: 149 },
      { size: "5kg",    price: 820,  costPrice: 719 },  // large bag visible
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // DISHWASH / CLEANING GEL (not oil — but found in same section)
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Kajal Concentrated Gel Dishwash Lemon",
    localName: "काजल कॉन्सेंट्रेटेड जेल डिशवॉश लेमन",
    brand: "Kajal", category: "Household",
    variants: [
      { size: "500ml",  price: 55,   costPrice: 48 },
      { size: "1L",     price: 95,   costPrice: 83 },
      { size: "5L",     price: 380,  costPrice: 333 },  // large 5L jerry can visible
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
        imageUrl: null,
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
          imageUrl: null,
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
