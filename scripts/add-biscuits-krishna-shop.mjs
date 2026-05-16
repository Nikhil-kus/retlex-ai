/**
 * add-biscuits-krishna-shop.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Adds all biscuit products visible in the shop photos to
 * "Shri Krishna Kirana and General Store".
 *
 * Each product is added in TWO variants:
 *   1. Small retail packet (₹5 / ₹10) — sold to end customers
 *   2. Bulk carton/bag (contains N small packets) — sold to other shops
 *
 * Run: node scripts/add-biscuits-krishna-shop.mjs
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
// Each entry = one product line.
// smallPrice  = retail price per small packet (₹)
// bulkQty     = how many small packets in one bulk carton/bag
// bulkPrice   = price of one bulk carton/bag (₹)
// Images from Open Food Facts / public CDN — best available for Indian market

const BISCUITS = [
  // ── PARLE ──────────────────────────────────────────────────────────────────
  {
    name: "Parle-G Biscuit",
    localName: "पारले-जी बिस्किट",
    brand: "Parle",
    category: "Biscuits",
    smallPrice: 5,
    bulkQty: 56,   // standard Parle-G carton = 56 pcs of ₹5
    bulkPrice: 280,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000489_7-parle-g-biscuits.jpg",
  },
  {
    name: "Parle-G Gold Biscuit",
    localName: "पारले-जी गोल्ड बिस्किट",
    brand: "Parle",
    category: "Biscuits",
    smallPrice: 10,
    bulkQty: 24,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076498_4-parle-g-gold-biscuits.jpg",
  },
  {
    name: "Parle-G Gluco Biscuit",
    localName: "पारले-जी ग्लूको बिस्किट",
    brand: "Parle",
    category: "Biscuits",
    smallPrice: 5,
    bulkQty: 56,
    bulkPrice: 280,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000489_7-parle-g-biscuits.jpg",
  },
  {
    name: "Monaco Biscuit",
    localName: "मोनाको बिस्किट",
    brand: "Parle",
    category: "Biscuits",
    smallPrice: 10,
    bulkQty: 24,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000490_6-parle-monaco-biscuits.jpg",
  },
  {
    name: "KrackJack Biscuit",
    localName: "क्रैकजैक बिस्किट",
    brand: "Parle",
    category: "Biscuits",
    smallPrice: 10,
    bulkQty: 24,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000491_5-parle-krackjack-biscuits.jpg",
  },
  {
    name: "Parle 20-20 Biscuit",
    localName: "पारले 20-20 बिस्किट",
    brand: "Parle",
    category: "Biscuits",
    smallPrice: 10,
    bulkQty: 24,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076499_3-parle-20-20-biscuits.jpg",
  },
  {
    name: "Parle Bourbon Biscuit",
    localName: "पारले बॉर्बन बिस्किट",
    brand: "Parle",
    category: "Biscuits",
    smallPrice: 10,
    bulkQty: 24,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000492_4-parle-bourbon-biscuits.jpg",
  },
  {
    name: "Parle Hide & Seek Biscuit",
    localName: "पारले हाइड एंड सीक",
    brand: "Parle",
    category: "Biscuits",
    smallPrice: 10,
    bulkQty: 24,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000493_3-parle-hide-seek-biscuits.jpg",
  },

  // ── BRITANNIA ──────────────────────────────────────────────────────────────
  {
    name: "Britannia Good Day Biscuit",
    localName: "ब्रिटानिया गुड डे बिस्किट",
    brand: "Britannia",
    category: "Biscuits",
    smallPrice: 10,
    bulkQty: 24,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000494_2-britannia-good-day-biscuits.jpg",
  },
  {
    name: "Britannia Marie Gold Biscuit",
    localName: "ब्रिटानिया मैरी गोल्ड बिस्किट",
    brand: "Britannia",
    category: "Biscuits",
    smallPrice: 10,
    bulkQty: 24,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000495_1-britannia-marie-gold-biscuits.jpg",
  },
  {
    name: "Britannia Marie Biscuit",
    localName: "ब्रिटानिया मैरी बिस्किट",
    brand: "Britannia",
    category: "Biscuits",
    smallPrice: 10,
    bulkQty: 24,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000495_1-britannia-marie-gold-biscuits.jpg",
  },
  {
    name: "Britannia Bourbon Biscuit",
    localName: "ब्रिटानिया बॉर्बन बिस्किट",
    brand: "Britannia",
    category: "Biscuits",
    smallPrice: 10,
    bulkQty: 24,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000496_9-britannia-bourbon-biscuits.jpg",
  },
  {
    name: "Britannia Nutri Choice Biscuit",
    localName: "ब्रिटानिया न्यूट्री चॉइस",
    brand: "Britannia",
    category: "Biscuits",
    smallPrice: 10,
    bulkQty: 24,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000497_8-britannia-nutri-choice-biscuits.jpg",
  },
  {
    name: "Britannia Jim Jam Biscuit",
    localName: "ब्रिटानिया जिम जैम",
    brand: "Britannia",
    category: "Biscuits",
    smallPrice: 5,
    bulkQty: 48,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000498_7-britannia-jim-jam-biscuits.jpg",
  },
  {
    name: "Britannia Tiger Biscuit",
    localName: "ब्रिटानिया टाइगर बिस्किट",
    brand: "Britannia",
    category: "Biscuits",
    smallPrice: 5,
    bulkQty: 48,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000499_6-britannia-tiger-biscuits.jpg",
  },
  {
    name: "Britannia Tiger Cream Biscuit",
    localName: "ब्रिटानिया टाइगर क्रीम",
    brand: "Britannia",
    category: "Biscuits",
    smallPrice: 5,
    bulkQty: 48,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000499_6-britannia-tiger-biscuits.jpg",
  },
  {
    name: "Britannia Mom's Magic Biscuit",
    localName: "ब्रिटानिया मॉम्स मैजिक",
    brand: "Britannia",
    category: "Biscuits",
    smallPrice: 10,
    bulkQty: 24,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000500_5-britannia-moms-magic-biscuits.jpg",
  },
  {
    name: "Britannia Rusk",
    localName: "ब्रिटानिया रस्क",
    brand: "Britannia",
    category: "Biscuits",
    smallPrice: 10,
    bulkQty: 24,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000501_4-britannia-rusk.jpg",
  },
  {
    name: "Britannia Nice Biscuit",
    localName: "ब्रिटानिया नाइस बिस्किट",
    brand: "Britannia",
    category: "Biscuits",
    smallPrice: 5,
    bulkQty: 48,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000502_3-britannia-nice-biscuits.jpg",
  },

  // ── SUNFEAST (ITC) ─────────────────────────────────────────────────────────
  {
    name: "Sunfeast Dark Fantasy Biscuit",
    localName: "सनफीस्ट डार्क फैंटेसी",
    brand: "Sunfeast",
    category: "Biscuits",
    smallPrice: 10,
    bulkQty: 24,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000503_2-sunfeast-dark-fantasy-biscuits.jpg",
  },
  {
    name: "Sunfeast Magix Biscuit",
    localName: "सनफीस्ट मैजिक्स बिस्किट",
    brand: "Sunfeast",
    category: "Biscuits",
    smallPrice: 5,
    bulkQty: 48,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000504_1-sunfeast-magix-biscuits.jpg",
  },

  // ── CADBURY / OREO ─────────────────────────────────────────────────────────
  {
    name: "Oreo Biscuit",
    localName: "ओरियो बिस्किट",
    brand: "Cadbury",
    category: "Biscuits",
    smallPrice: 5,
    bulkQty: 48,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000505_9-cadbury-oreo-biscuits.jpg",
  },

  // ── PATANJALI ──────────────────────────────────────────────────────────────
  {
    name: "Patanjali Biscuit",
    localName: "पतंजलि बिस्किट",
    brand: "Patanjali",
    category: "Biscuits",
    smallPrice: 5,
    bulkQty: 48,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000506_8-patanjali-biscuits.jpg",
  },
  {
    name: "Patanjali Milk Shakti Biscuit",
    localName: "पतंजलि मिल्क शक्ति बिस्किट",
    brand: "Patanjali",
    category: "Biscuits",
    smallPrice: 5,
    bulkQty: 48,
    bulkPrice: 240,
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/20000506_8-patanjali-biscuits.jpg",
  },

  // ── NAARIYAL ───────────────────────────────────────────────────────────────
  {
    name: "Naariyal Biscuit",
    localName: "नारियल बिस्किट",
    brand: "Naariyal",
    category: "Biscuits",
    smallPrice: 5,
    bulkQty: 48,
    bulkPrice: 240,
    imageUrl: null,
  },

  // ── PARLE TOAST ────────────────────────────────────────────────────────────
  {
    name: "Parle Toast",
    localName: "पारले टोस्ट",
    brand: "Parle",
    category: "Biscuits",
    smallPrice: 10,
    bulkQty: 24,
    bulkPrice: 240,
    imageUrl: null,
  },

  // ── 50-50 GOL MAAL ─────────────────────────────────────────────────────────
  {
    name: "Parle 50-50 Gol Maal Biscuit",
    localName: "पारले 50-50 गोल माल",
    brand: "Parle",
    category: "Biscuits",
    smallPrice: 10,
    bulkQty: 24,
    bulkPrice: 240,
    imageUrl: null,
  },

  // ── D-DARK ─────────────────────────────────────────────────────────────────
  {
    name: "D-Dark Cookies",
    localName: "डी-डार्क कुकीज",
    brand: "D-Dark",
    category: "Biscuits",
    smallPrice: 10,
    bulkQty: 24,
    bulkPrice: 240,
    imageUrl: null,
  },

  // ── KISMI ──────────────────────────────────────────────────────────────────
  {
    name: "Kismi Toffee Bar",
    localName: "किस्मी टॉफी बार",
    brand: "Parle",
    category: "Confectionery",
    smallPrice: 5,
    bulkQty: 60,
    bulkPrice: 300,
    imageUrl: null,
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Finding Shri Krishna Kirana shop...\n");

  // Find the shop by name (case-insensitive partial match)
  const shopsSnap = await getDocs(collection(db, "shops"));
  let targetShop = null;

  for (const d of shopsSnap.docs) {
    const name = (d.data().name || "").toLowerCase();
    if (name.includes("krishna") || name.includes("shri krishna")) {
      targetShop = { id: d.id, ...d.data() };
      break;
    }
  }

  if (!targetShop) {
    console.error("❌ Shop 'Shri Krishna Kirana' not found in Firestore.");
    console.log("Available shops:");
    shopsSnap.docs.forEach(d => console.log(`  - ${d.data().name} (${d.id})`));
    process.exit(1);
  }

  console.log(`✅ Found shop: ${targetShop.name} (${targetShop.id})\n`);

  // Fetch existing products to avoid duplicates
  const existingSnap = await getDocs(
    query(collection(db, "products"), where("shopId", "==", targetShop.id))
  );
  const existingNames = new Set(
    existingSnap.docs.map(d => (d.data().name || "").toLowerCase().trim())
  );
  console.log(`📦 Existing products in shop: ${existingNames.size}\n`);

  let added = 0;
  let skipped = 0;

  for (const biscuit of BISCUITS) {
    // ── 1. Small retail packet ──────────────────────────────────────────────
    const smallName = biscuit.name;
    const smallKey = smallName.toLowerCase().trim();

    if (existingNames.has(smallKey)) {
      console.log(`  ⏭  SKIP (exists): ${smallName}`);
      skipped++;
    } else {
      const smallDoc = {
        name: smallName,
        localName: biscuit.localName || null,
        brand: biscuit.brand || null,
        category: biscuit.category,
        price: biscuit.smallPrice,
        costPrice: Math.round(biscuit.smallPrice * 0.85), // ~15% margin estimate
        baseUnit: "pc",
        baseQuantity: 1,
        packetWeight: null,
        packetUnit: null,
        imageUrl: biscuit.imageUrl || null,
        shopId: targetShop.id,
        variant: "Small Packet",
        createdAt: new Date().toISOString(),
        source: "manual_ingest",
      };
      await addDoc(collection(db, "products"), smallDoc);
      existingNames.add(smallKey);
      console.log(`  ✅ Added: ${smallName} @ ₹${biscuit.smallPrice}`);
      added++;

      // Upsert to globalCatalog
      const gcId = `gc_${smallKey.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 60)}`;
      await setDoc(doc(db, "globalCatalog", gcId), {
        name: smallName,
        localName: biscuit.localName || null,
        brand: biscuit.brand || null,
        category: biscuit.category,
        baseUnit: "pc",
        baseQuantity: 1,
        price: biscuit.smallPrice,
        imageUrl: biscuit.imageUrl || null,
        createdAt: new Date().toISOString(),
        sourceShopId: targetShop.id,
      }, { merge: true });
    }

    // ── 2. Bulk carton/bag ──────────────────────────────────────────────────
    const bulkName = `${biscuit.name} (Bulk ${biscuit.bulkQty} pcs)`;
    const bulkKey = bulkName.toLowerCase().trim();

    if (existingNames.has(bulkKey)) {
      console.log(`  ⏭  SKIP (exists): ${bulkName}`);
      skipped++;
    } else {
      const bulkDoc = {
        name: bulkName,
        localName: biscuit.localName ? `${biscuit.localName} (बल्क ${biscuit.bulkQty} पीस)` : null,
        brand: biscuit.brand || null,
        category: biscuit.category,
        price: biscuit.bulkPrice,
        costPrice: Math.round(biscuit.bulkPrice * 0.88), // ~12% margin on bulk
        baseUnit: "pc",
        baseQuantity: 1,
        packetWeight: null,
        packetUnit: null,
        imageUrl: biscuit.imageUrl || null,
        shopId: targetShop.id,
        variant: `Bulk Carton (${biscuit.bulkQty} pcs)`,
        bulkOf: smallName,
        bulkQty: biscuit.bulkQty,
        createdAt: new Date().toISOString(),
        source: "manual_ingest",
      };
      await addDoc(collection(db, "products"), bulkDoc);
      existingNames.add(bulkKey);
      console.log(`  ✅ Added: ${bulkName} @ ₹${biscuit.bulkPrice}`);
      added++;
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`✅ Done! Added: ${added} products | Skipped: ${skipped} duplicates`);
  console.log(`📦 Total products in shop now: ${existingNames.size}`);
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
