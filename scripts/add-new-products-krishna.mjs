/**
 * add-new-products-krishna.mjs
 * New products identified from fresh image analysis:
 * - Ghee brands: Paras, Ashok, Khajuraho, Amul, Shreemul, Patanjali
 * - Flour: Silver Coin Suji/Maida, Bafla Baati Atta, Desi Makka Atta
 * - Sabudana: Sachamoti, Royal Ratan
 * - Namkeen: A-1 variants, Seehor, Rajesh, Mohan
 * - Instant mixes: Agrawal's 420 Dahivala (missed earlier)
 * - Papad: KPR Papad, Agrawal's 420 Papad Katran, Sachasabu Sabudana Papad
 * - Drinks: Nescafe Sunrise, Gufuji Thandai, Gufuji Kesar Sharbat
 * - Other: Weikfield Custard Powder, Savlon Antiseptic Liquid, Streax Hair Colour
 * Run: node scripts/add-new-products-krishna.mjs
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
  // GHEE — New brands identified
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Paras Premium Desi Ghee",
    localName: "पारस प्रीमियम देसी घी",
    brand: "Paras", category: "Dairy",
    variants: [
      { size: "200ml",  price: 130, costPrice: 114 },
      { size: "500ml",  price: 300, costPrice: 263 },
      { size: "1L",     price: 570, costPrice: 500 },
    ],
  },
  {
    baseName: "Ashok Ghee",
    localName: "अशोक घी",
    brand: "Ashok", category: "Dairy",
    variants: [
      { size: "200ml",  price: 120, costPrice: 105 },
      { size: "500ml",  price: 280, costPrice: 246 },
      { size: "1L",     price: 540, costPrice: 474 },
    ],
  },
  {
    baseName: "Khajuraho Ghee",
    localName: "खजुराहो घी",
    brand: "Khajuraho", category: "Dairy",
    variants: [
      { size: "200ml",  price: 115, costPrice: 100 },
      { size: "500ml",  price: 270, costPrice: 237 },
      { size: "1L",     price: 520, costPrice: 456 },
    ],
  },
  {
    baseName: "Amul Pure Ghee",
    localName: "अमूल शुद्ध घी",
    brand: "Amul", category: "Dairy",
    variants: [
      { size: "200ml",  price: 145, costPrice: 127 },
      { size: "500ml",  price: 340, costPrice: 298 },
      { size: "1L",     price: 650, costPrice: 571 },
    ],
  },
  {
    baseName: "Shreemul Pure Ghee",
    localName: "श्रीमुल शुद्ध घी",
    brand: "Shreemul", category: "Dairy",
    variants: [
      { size: "200ml",  price: 120, costPrice: 105 },
      { size: "500ml",  price: 280, costPrice: 246 },
      { size: "1L",     price: 540, costPrice: 474 },
    ],
  },
  {
    baseName: "Patanjali Desi Ghee",
    localName: "पतंजलि देसी घी",
    brand: "Patanjali", category: "Dairy",
    variants: [
      { size: "200ml",  price: 120, costPrice: 105 },
      { size: "500ml",  price: 280, costPrice: 246 },
      { size: "1L",     price: 540, costPrice: 474 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // FLOUR — Silver Coin brand + specialty flours
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Silver Coin Suji (Semolina)",
    localName: "सिल्वर कॉइन सूजी",
    brand: "Silver Coin", category: "Grains & Pulses",
    variants: [
      { size: "500g",   price: 30,  costPrice: 26 },
      { size: "1kg",    price: 55,  costPrice: 48 },
    ],
  },
  {
    baseName: "Silver Coin Maida (All Purpose Flour)",
    localName: "सिल्वर कॉइन मैदा",
    brand: "Silver Coin", category: "Grains & Pulses",
    variants: [
      { size: "500g",   price: 28,  costPrice: 24 },
      { size: "1kg",    price: 50,  costPrice: 43 },
    ],
  },
  {
    baseName: "Bafla Baati Atta (Wheat Flour)",
    localName: "बाफला बाटी आटा",
    brand: "Bafla Baati", category: "Grains & Pulses",
    variants: [
      { size: "1kg",    price: 45,  costPrice: 39 },
      { size: "5kg",    price: 210, costPrice: 184 },
    ],
  },
  {
    baseName: "Desi Makka Atta (Maize Flour)",
    localName: "देसी मक्का आटा",
    brand: "Desi", category: "Grains & Pulses",
    variants: [
      { size: "1kg",    price: 40,  costPrice: 35 },
      { size: "5kg",    price: 185, costPrice: 162 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // SABUDANA (Tapioca Pearls)
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Sachamoti Sabudana",
    localName: "सचामोती साबूदाना",
    brand: "Sachamoti", category: "Grains & Pulses",
    variants: [
      { size: "500g",   price: 55,  costPrice: 48 },
      { size: "1kg",    price: 100, costPrice: 87 },
    ],
  },
  {
    baseName: "Royal Ratan Sachamoti Sabudana",
    localName: "रॉयल रतन सचामोती साबूदाना",
    brand: "Royal Ratan", category: "Grains & Pulses",
    variants: [
      { size: "500g",   price: 55,  costPrice: 48 },
      { size: "1kg",    price: 100, costPrice: 87 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // NAMKEEN — New variants identified
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "A-1 Namkeen Super Poha Mixture",
    localName: "ए-1 नमकीन सुपर पोहा मिक्सचर",
    brand: "A-1", category: "Snacks",
    variants: [
      { size: "200g",   price: 40,  costPrice: 35 },
      { size: "400g",   price: 75,  costPrice: 65 },
    ],
  },
  {
    baseName: "A-1 Namkeen Mota Laung Sev",
    localName: "ए-1 नमकीन मोटा लौंग सेव",
    brand: "A-1", category: "Snacks",
    variants: [
      { size: "200g",   price: 40,  costPrice: 35 },
      { size: "400g",   price: 75,  costPrice: 65 },
    ],
  },
  {
    baseName: "Seehor Namkeen Barik Sev",
    localName: "सीहोर नमकीन बारीक सेव",
    brand: "Seehor", category: "Snacks",
    variants: [
      { size: "200g",   price: 35,  costPrice: 30 },
      { size: "400g",   price: 65,  costPrice: 57 },
    ],
  },
  {
    baseName: "Rajesh Namkeen Sev",
    localName: "राजेश नमकीन सेव",
    brand: "Rajesh", category: "Snacks",
    variants: [
      { size: "400g",   price: 70,  costPrice: 61 },
    ],
  },
  {
    baseName: "Rajesh Namkeen Hara Bhara Mix",
    localName: "राजेश नमकीन हरा भरा मिक्स",
    brand: "Rajesh", category: "Snacks",
    variants: [
      { size: "400g",   price: 70,  costPrice: 61 },
    ],
  },
  {
    baseName: "Nice Namkeen Khatta Meetha Mixture",
    localName: "नाइस नमकीन खट्टा मीठा मिक्सचर",
    brand: "Nice", category: "Snacks",
    variants: [
      { size: "200g",   price: 40,  costPrice: 35 },
      { size: "500g",   price: 90,  costPrice: 79 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // INSTANT MIX — Agrawal's 420 Dahivala (missed earlier)
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Agrawal's 420 Dahivala Instant Mix",
    localName: "अग्रवाल 420 दहीवाला इंस्टेंट मिक्स",
    brand: "Agrawal's 420", category: "Food & Grocery",
    variants: [
      { size: "200g",   price: 55,  costPrice: 48 },
      { size: "500g",   price: 120, costPrice: 105 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // PAPAD — New brands
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "KPR Papad",
    localName: "केपीआर पापड़",
    brand: "KPR", category: "Food & Grocery",
    variants: [
      { size: "200g",   price: 40,  costPrice: 35 },
      { size: "400g",   price: 75,  costPrice: 65 },
    ],
  },
  {
    baseName: "Agrawal's 420 Papad Katran",
    localName: "अग्रवाल 420 पापड़ कतरन",
    brand: "Agrawal's 420", category: "Food & Grocery",
    variants: [
      { size: "200g",   price: 35,  costPrice: 30 },
      { size: "400g",   price: 65,  costPrice: 57 },
    ],
  },
  {
    baseName: "Sachasabu Sabudana Papad",
    localName: "सचासाबू साबूदाना पापड़",
    brand: "Sachasabu", category: "Food & Grocery",
    variants: [
      { size: "200g",   price: 45,  costPrice: 39 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // DRINKS & BEVERAGES
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Nescafe Sunrise Extra Coffee",
    localName: "नेस्काफे सनराइज एक्स्ट्रा कॉफी",
    brand: "Nescafe", category: "Beverages",
    variants: [
      { size: "25g",    price: 55,  costPrice: 48 },
      { size: "50g",    price: 100, costPrice: 87 },
      { size: "100g",   price: 185, costPrice: 162 },
      { size: "200g",   price: 350, costPrice: 307 },
    ],
  },
  {
    baseName: "Gufuji Thandai Powder",
    localName: "गुफुजी ठंडाई पाउडर",
    brand: "Gufuji", category: "Beverages",
    variants: [
      { size: "200g",   price: 80,  costPrice: 70 },
      { size: "400g",   price: 150, costPrice: 131 },
    ],
  },
  {
    baseName: "Gufuji Kesar Sharbat",
    localName: "गुफुजी केसर शरबत",
    brand: "Gufuji", category: "Beverages",
    variants: [
      { size: "750ml",  price: 120, costPrice: 105 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // DESSERT MIXES
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Weikfield Custard Powder Vanilla",
    localName: "वेकफील्ड कस्टर्ड पाउडर वनीला",
    brand: "Weikfield", category: "Food & Grocery",
    variants: [
      { size: "100g",   price: 55,  costPrice: 48 },
      { size: "200g",   price: 100, costPrice: 87 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // PERSONAL CARE / HOUSEHOLD
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Savlon Antiseptic Liquid",
    localName: "सेवलॉन एंटीसेप्टिक लिक्विड",
    brand: "Savlon", category: "Personal Care",
    variants: [
      { size: "100ml",  price: 65,  costPrice: 57 },
      { size: "200ml",  price: 115, costPrice: 100 },
      { size: "500ml",  price: 250, costPrice: 219 },
    ],
  },
  {
    baseName: "Streax Shampoo Hair Colour",
    localName: "स्ट्रेक्स शैम्पू हेयर कलर",
    brand: "Streax", category: "Personal Care",
    variants: [
      { size: "Single Sachet", price: 10,  costPrice: 8 },
      { size: "Box (10 sachets)", price: 90, costPrice: 79 },
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
