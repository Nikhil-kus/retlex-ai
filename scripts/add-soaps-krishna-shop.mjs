/**
 * add-soaps-krishna-shop.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Adds all soap & detergent bar products visible in the shop photos to
 * "Shri Krishna Kirana and General Store".
 *
 * Each product line has up to 3 variants:
 *   1. Single bar (retail)
 *   2. Bundle pack (4+1 / 3+1 / 4-pack) — different price per unit
 *   3. Bulk carton (wholesale to other shops) — where applicable
 *
 * Run: node scripts/add-soaps-krishna-shop.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, addDoc,
  query, where, doc, setDoc
} from "firebase/firestore";

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

// ── Product definitions ────────────────────────────────────────────────────────
// variants array: each entry = one SKU to add
// type: 'single' | 'bundle' | 'bulk'
// bundleCount: how many bars in the bundle
// price: selling price (₹)
// costPrice: approx purchase price (₹)

const SOAPS = [

  // ── DETTOL ─────────────────────────────────────────────────────────────────
  {
    baseName: "Dettol Original Soap",
    localName: "डेटॉल ओरिजिनल साबुन",
    brand: "Dettol",
    category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076500_4-dettol-original-soap.jpg",
    variants: [
      { type: "single", label: "75g",         price: 40,  costPrice: 35 },
      { type: "bundle", label: "4+1 Free Pack (5 bars)", bundleCount: 5, price: 160, costPrice: 140 },
      { type: "bulk",   label: "Bulk 12 pcs", bundleCount: 12, price: 420, costPrice: 390 },
    ],
  },

  // ── SAVLON ─────────────────────────────────────────────────────────────────
  {
    baseName: "Savlon Soap",
    localName: "सेवलॉन साबुन",
    brand: "Savlon",
    category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076501_3-savlon-soap.jpg",
    variants: [
      { type: "single", label: "75g",         price: 35,  costPrice: 30 },
      { type: "bundle", label: "4 Pack",      bundleCount: 4, price: 130, costPrice: 115 },
      { type: "bulk",   label: "Bulk 12 pcs", bundleCount: 12, price: 380, costPrice: 350 },
    ],
  },

  // ── LIFEBUOY ───────────────────────────────────────────────────────────────
  {
    baseName: "Lifebuoy Total Soap",
    localName: "लाइफबॉय टोटल साबुन",
    brand: "Lifebuoy",
    category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076502_2-lifebuoy-total-soap.jpg",
    variants: [
      { type: "single", label: "100g",        price: 35,  costPrice: 30 },
      { type: "bundle", label: "4 Pack",      bundleCount: 4, price: 130, costPrice: 115 },
      { type: "bulk",   label: "Bulk 12 pcs", bundleCount: 12, price: 380, costPrice: 350 },
    ],
  },

  // ── LUX ────────────────────────────────────────────────────────────────────
  {
    baseName: "Lux Soft Glow Soap",
    localName: "लक्स सॉफ्ट ग्लो साबुन",
    brand: "Lux",
    category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076503_1-lux-soft-glow-soap.jpg",
    variants: [
      { type: "single", label: "100g",              price: 40,  costPrice: 35 },
      { type: "bundle", label: "4+1 Free Pack (5 bars)", bundleCount: 5, price: 160, costPrice: 140 },
      { type: "bulk",   label: "Bulk 12 pcs",       bundleCount: 12, price: 430, costPrice: 400 },
    ],
  },
  {
    baseName: "Lux Velvet Glow Soap",
    localName: "लक्स वेलवेट ग्लो साबुन",
    brand: "Lux",
    category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076503_1-lux-soft-glow-soap.jpg",
    variants: [
      { type: "single", label: "100g",              price: 40,  costPrice: 35 },
      { type: "bundle", label: "4+1 Free Pack (5 bars)", bundleCount: 5, price: 160, costPrice: 140 },
    ],
  },

  // ── LIRIL ──────────────────────────────────────────────────────────────────
  {
    baseName: "Liril Soap",
    localName: "लिरिल साबुन",
    brand: "Liril",
    category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076504_9-liril-soap.jpg",
    variants: [
      { type: "single", label: "75g",         price: 35,  costPrice: 30 },
      { type: "bundle", label: "3+1 Free Pack (4 bars)", bundleCount: 4, price: 125, costPrice: 110 },
      { type: "bulk",   label: "Bulk 12 pcs", bundleCount: 12, price: 380, costPrice: 350 },
    ],
  },

  // ── VIVEL ──────────────────────────────────────────────────────────────────
  {
    baseName: "Vivel Soap",
    localName: "विवेल साबुन",
    brand: "Vivel",
    category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076505_8-vivel-soap.jpg",
    variants: [
      { type: "single", label: "100g",        price: 30,  costPrice: 26 },
      { type: "bundle", label: "4 Pack",      bundleCount: 4, price: 110, costPrice: 98 },
    ],
  },

  // ── NIMA ───────────────────────────────────────────────────────────────────
  {
    baseName: "Nima Sandal Soap",
    localName: "निमा चंदन साबुन",
    brand: "Nima",
    category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076506_7-nima-sandal-soap.jpg",
    variants: [
      { type: "single", label: "100g",        price: 25,  costPrice: 21 },
      { type: "bundle", label: "4 Pack",      bundleCount: 4, price: 90,  costPrice: 80 },
      { type: "bulk",   label: "Bulk 12 pcs", bundleCount: 12, price: 260, costPrice: 240 },
    ],
  },
  {
    baseName: "Nima Rose Soap",
    localName: "निमा रोज साबुन",
    brand: "Nima",
    category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076506_7-nima-sandal-soap.jpg",
    variants: [
      { type: "single", label: "100g",        price: 25,  costPrice: 21 },
      { type: "bundle", label: "4 Pack",      bundleCount: 4, price: 90,  costPrice: 80 },
    ],
  },

  // ── GODREJ NO.1 ────────────────────────────────────────────────────────────
  {
    baseName: "Godrej No.1 Soap",
    localName: "गोदरेज नंबर 1 साबुन",
    brand: "Godrej",
    category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076507_6-godrej-no1-soap.jpg",
    variants: [
      { type: "single", label: "100g",        price: 25,  costPrice: 21 },
      { type: "bundle", label: "4+1 Free Pack (5 bars)", bundleCount: 5, price: 100, costPrice: 88 },
      { type: "bulk",   label: "Bulk 12 pcs", bundleCount: 12, price: 270, costPrice: 248 },
    ],
  },
  {
    baseName: "Godrej No.1 Lime Aloe Vera Soap",
    localName: "गोदरेज नंबर 1 लाइम एलोवेरा",
    brand: "Godrej",
    category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076507_6-godrej-no1-soap.jpg",
    variants: [
      { type: "single", label: "100g",        price: 25,  costPrice: 21 },
      { type: "bundle", label: "4+1 Free Pack (5 bars)", bundleCount: 5, price: 100, costPrice: 88 },
    ],
  },
  {
    baseName: "Godrej No.1 Coconut Milk Cream Soap",
    localName: "गोदरेज नंबर 1 नारियल मिल्क",
    brand: "Godrej",
    category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076507_6-godrej-no1-soap.jpg",
    variants: [
      { type: "single", label: "100g",        price: 25,  costPrice: 21 },
      { type: "bundle", label: "4+1 Free Pack (5 bars)", bundleCount: 5, price: 100, costPrice: 88 },
    ],
  },

  // ── CINTHOL ────────────────────────────────────────────────────────────────
  {
    baseName: "Cinthol Lime Soap",
    localName: "सिंथोल लाइम साबुन",
    brand: "Cinthol",
    category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076508_5-cinthol-lime-soap.jpg",
    variants: [
      { type: "single", label: "100g",        price: 35,  costPrice: 30 },
      { type: "bundle", label: "4 Pack",      bundleCount: 4, price: 130, costPrice: 115 },
    ],
  },

  // ── MEDIMIX ────────────────────────────────────────────────────────────────
  {
    baseName: "Medimix Soap",
    localName: "मेडिमिक्स साबुन",
    brand: "Medimix",
    category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076509_4-medimix-soap.jpg",
    variants: [
      { type: "single", label: "75g",         price: 40,  costPrice: 35 },
      { type: "bundle", label: "4 Pack",      bundleCount: 4, price: 150, costPrice: 132 },
    ],
  },

  // ── NIRMA ──────────────────────────────────────────────────────────────────
  {
    baseName: "Nirma Beauty Soap",
    localName: "निरमा ब्यूटी साबुन",
    brand: "Nirma",
    category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076510_3-nirma-beauty-soap.jpg",
    variants: [
      { type: "single", label: "100g",        price: 20,  costPrice: 17 },
      { type: "bundle", label: "4 Pack",      bundleCount: 4, price: 75,  costPrice: 65 },
      { type: "bulk",   label: "Bulk 12 pcs", bundleCount: 12, price: 210, costPrice: 192 },
    ],
  },
  {
    baseName: "Nirma Soap Small",
    localName: "निरमा साबुन छोटा",
    brand: "Nirma",
    category: "Personal Care",
    imageUrl: null,
    variants: [
      { type: "single", label: "₹10",         price: 10,  costPrice: 8 },
    ],
  },

  // ── PEARS ──────────────────────────────────────────────────────────────────
  {
    baseName: "Pears Soap",
    localName: "पियर्स साबुन",
    brand: "Pears",
    category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076511_2-pears-soap.jpg",
    variants: [
      { type: "single", label: "75g",         price: 55,  costPrice: 48 },
      { type: "bundle", label: "3+1 Free Pack (4 bars)", bundleCount: 4, price: 200, costPrice: 178 },
    ],
  },

  // ── DOVE ───────────────────────────────────────────────────────────────────
  {
    baseName: "Dove Cool Moisture Soap",
    localName: "डव कूल मॉइस्चर साबुन",
    brand: "Dove",
    category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076512_1-dove-soap.jpg",
    variants: [
      { type: "single", label: "100g",        price: 65,  costPrice: 57 },
      { type: "bundle", label: "3+1 Free Pack (4 bars)", bundleCount: 4, price: 240, costPrice: 215 },
    ],
  },

  // ── PATANJALI ──────────────────────────────────────────────────────────────
  {
    baseName: "Patanjali Neem Kanti Soap",
    localName: "पतंजलि नीम कांति साबुन",
    brand: "Patanjali",
    category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076513_9-patanjali-neem-kanti-soap.jpg",
    variants: [
      { type: "single", label: "75g",         price: 25,  costPrice: 21 },
      { type: "bundle", label: "4+1 Free Pack (5 bars)", bundleCount: 5, price: 100, costPrice: 88 },
    ],
  },

  // ── JO SOAP ────────────────────────────────────────────────────────────────
  {
    baseName: "JO Soap",
    localName: "जो साबुन",
    brand: "JO",
    category: "Personal Care",
    imageUrl: null,
    variants: [
      { type: "single", label: "100g",        price: 20,  costPrice: 17 },
      { type: "bundle", label: "4 Pack",      bundleCount: 4, price: 75,  costPrice: 65 },
    ],
  },

  // ── DETERGENT BARS ─────────────────────────────────────────────────────────
  {
    baseName: "Rin Detergent Bar",
    localName: "रिन डिटर्जेंट बार",
    brand: "Rin",
    category: "Household",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076514_8-rin-detergent-bar.jpg",
    variants: [
      { type: "single", label: "250g",        price: 20,  costPrice: 17 },
      { type: "bundle", label: "4 Pack",      bundleCount: 4, price: 75,  costPrice: 65 },
      { type: "bulk",   label: "Bulk 12 pcs", bundleCount: 12, price: 210, costPrice: 192 },
    ],
  },
  {
    baseName: "Nirma Detergent Bar",
    localName: "निरमा डिटर्जेंट बार",
    brand: "Nirma",
    category: "Household",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076515_7-nirma-detergent-bar.jpg",
    variants: [
      { type: "single", label: "200g",        price: 15,  costPrice: 12 },
      { type: "bundle", label: "4 Pack",      bundleCount: 4, price: 55,  costPrice: 48 },
      { type: "bulk",   label: "Bulk 12 pcs", bundleCount: 12, price: 160, costPrice: 145 },
    ],
  },
  {
    baseName: "Wheel Detergent Bar",
    localName: "व्हील डिटर्जेंट बार",
    brand: "Wheel",
    category: "Household",
    imageUrl: null,
    variants: [
      { type: "single", label: "200g",        price: 15,  costPrice: 12 },
      { type: "bundle", label: "4 Pack",      bundleCount: 4, price: 55,  costPrice: 48 },
    ],
  },

  // ── NIP / MR. MAHABAR ──────────────────────────────────────────────────────
  {
    baseName: "Nip Soap",
    localName: "निप साबुन",
    brand: "Nip",
    category: "Personal Care",
    imageUrl: null,
    variants: [
      { type: "single", label: "100g",        price: 15,  costPrice: 12 },
      { type: "bundle", label: "4 Pack",      bundleCount: 4, price: 55,  costPrice: 48 },
    ],
  },
  {
    baseName: "Mr. Mahabar Soap",
    localName: "मिस्टर महाबार साबुन",
    brand: "Mr. Mahabar",
    category: "Personal Care",
    imageUrl: null,
    variants: [
      { type: "single", label: "100g",        price: 15,  costPrice: 12 },
      { type: "bundle", label: "3+1 Free Pack (4 bars)", bundleCount: 4, price: 55, costPrice: 48 },
    ],
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Finding Shri Krishna Kirana shop...\n");

  const shopsSnap = await getDocs(collection(db, "shops"));
  let targetShop = null;
  for (const d of shopsSnap.docs) {
    const name = (d.data().name || "").toLowerCase();
    if (name.includes("krishna")) {
      targetShop = { id: d.id, ...d.data() };
      break;
    }
  }

  if (!targetShop) {
    console.error("❌ Shop not found.");
    process.exit(1);
  }
  console.log(`✅ Found: ${targetShop.name} (${targetShop.id})\n`);

  // Fetch existing products
  const existingSnap = await getDocs(
    query(collection(db, "products"), where("shopId", "==", targetShop.id))
  );
  const existingNames = new Set(
    existingSnap.docs.map(d => (d.data().name || "").toLowerCase().trim())
  );
  console.log(`📦 Existing products: ${existingNames.size}\n`);

  let added = 0;
  let skipped = 0;

  for (const soap of SOAPS) {
    for (const variant of soap.variants) {
      // Build the product name
      let productName;
      if (variant.type === "single") {
        productName = `${soap.baseName} (${variant.label})`;
      } else if (variant.type === "bundle") {
        productName = `${soap.baseName} - ${variant.label}`;
      } else {
        productName = `${soap.baseName} - ${variant.label}`;
      }

      const nameKey = productName.toLowerCase().trim();

      if (existingNames.has(nameKey)) {
        console.log(`  ⏭  SKIP: ${productName}`);
        skipped++;
        continue;
      }

      const productDoc = {
        name: productName,
        localName: soap.localName || null,
        brand: soap.brand || null,
        category: soap.category,
        price: variant.price,
        costPrice: variant.costPrice,
        baseUnit: "pc",
        baseQuantity: 1,
        packetWeight: null,
        packetUnit: null,
        imageUrl: soap.imageUrl || null,
        shopId: targetShop.id,
        variant: variant.label,
        variantType: variant.type,
        ...(variant.bundleCount ? { bundleCount: variant.bundleCount } : {}),
        createdAt: new Date().toISOString(),
        source: "manual_ingest",
      };

      await addDoc(collection(db, "products"), productDoc);
      existingNames.add(nameKey);
      console.log(`  ✅ Added: ${productName} @ ₹${variant.price}`);
      added++;

      // Upsert to globalCatalog (single bar only to avoid polluting catalog)
      if (variant.type === "single") {
        const gcId = `gc_${nameKey.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 60)}`;
        await setDoc(doc(db, "globalCatalog", gcId), {
          name: productName,
          localName: soap.localName || null,
          brand: soap.brand || null,
          category: soap.category,
          baseUnit: "pc",
          baseQuantity: 1,
          price: variant.price,
          imageUrl: soap.imageUrl || null,
          createdAt: new Date().toISOString(),
          sourceShopId: targetShop.id,
        }, { merge: true });
      }
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`✅ Done! Added: ${added} | Skipped: ${skipped} duplicates`);
  console.log(`📦 Total products in shop now: ${existingNames.size}`);
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
