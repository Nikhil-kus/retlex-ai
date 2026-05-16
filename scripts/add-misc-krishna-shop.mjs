/**
 * add-misc-krishna-shop.mjs
 * Toothpaste, honey, hair oil, baby products, cleaners, shoe polish,
 * agarbatti, detergents, and other misc products — all with size variants.
 * Run: node scripts/add-misc-krishna-shop.mjs
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

// Each product line has variants (sizes/types), each with its own price
const PRODUCTS = [

  // ══════════════════════════════════════════════════════════════════
  // TOOTHPASTE & TOOTHPOWDER
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Colgate Strong Teeth Toothpaste",
    localName: "कोलगेट स्ट्रॉन्ग टीथ टूथपेस्ट",
    brand: "Colgate", category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076520_2-colgate-strong-teeth-toothpaste.jpg",
    variants: [
      { size: "30g",  price: 30,  costPrice: 26 },
      { size: "45g",  price: 45,  costPrice: 39 },
      { size: "100g", price: 75,  costPrice: 65 },
      { size: "200g", price: 130, costPrice: 114 },
      { size: "300g", price: 185, costPrice: 162 },
    ],
  },
  {
    baseName: "Colgate MaxFresh Toothpaste",
    localName: "कोलगेट मैक्सफ्रेश टूथपेस्ट",
    brand: "Colgate", category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076521_1-colgate-maxfresh-toothpaste.jpg",
    variants: [
      { size: "75g",  price: 65,  costPrice: 57 },
      { size: "150g", price: 115, costPrice: 100 },
    ],
  },
  {
    baseName: "Colgate Salt Neem Toothpaste",
    localName: "कोलगेट नमक नीम टूथपेस्ट",
    brand: "Colgate", category: "Personal Care",
    imageUrl: null,
    variants: [
      { size: "100g", price: 75,  costPrice: 65 },
      { size: "200g", price: 130, costPrice: 114 },
    ],
  },
  {
    baseName: "Colgate Lemon Toothpaste",
    localName: "कोलगेट लेमन टूथपेस्ट",
    brand: "Colgate", category: "Personal Care",
    imageUrl: null,
    variants: [
      { size: "100g", price: 75,  costPrice: 65 },
    ],
  },
  {
    baseName: "Colgate Cibaca Toothpaste",
    localName: "कोलगेट सिबाका टूथपेस्ट",
    brand: "Colgate", category: "Personal Care",
    imageUrl: null,
    variants: [
      { size: "100g", price: 55,  costPrice: 48 },
      { size: "175g", price: 90,  costPrice: 79 },
    ],
  },
  {
    baseName: "Colgate Super Rakshak Toothpowder",
    localName: "कोलगेट सुपर रक्षक टूथपाउडर",
    brand: "Colgate", category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076522_9-colgate-super-rakshak-toothpowder.jpg",
    variants: [
      { size: "50g",  price: 35,  costPrice: 30 },
      { size: "200g", price: 100, costPrice: 87 },
    ],
  },
  {
    baseName: "Closeup Toothpaste",
    localName: "क्लोजअप टूथपेस्ट",
    brand: "Closeup", category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076523_8-closeup-toothpaste.jpg",
    variants: [
      { size: "80g",  price: 55,  costPrice: 48 },
      { size: "150g", price: 95,  costPrice: 83 },
    ],
  },
  {
    baseName: "Babool Toothpaste",
    localName: "बबूल टूथपेस्ट",
    brand: "Babool", category: "Personal Care",
    imageUrl: null,
    variants: [
      { size: "100g", price: 40,  costPrice: 35 },
      { size: "200g", price: 70,  costPrice: 61 },
    ],
  },
  {
    baseName: "Patanjali Dant Kanti Toothpaste",
    localName: "पतंजलि दंत कांति टूथपेस्ट",
    brand: "Patanjali", category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076524_7-patanjali-dant-kanti-toothpaste.jpg",
    variants: [
      { size: "100g", price: 50,  costPrice: 43 },
      { size: "200g", price: 90,  costPrice: 79 },
    ],
  },
  {
    baseName: "Vicco Vajradanti Toothpaste",
    localName: "विको वज्रदंती टूथपेस्ट",
    brand: "Vicco", category: "Personal Care",
    imageUrl: null,
    variants: [
      { size: "100g", price: 65,  costPrice: 57 },
      { size: "200g", price: 115, costPrice: 100 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // HONEY
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Dabur Honey",
    localName: "डाबर शहद",
    brand: "Dabur", category: "Food & Grocery",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076525_6-dabur-honey.jpg",
    variants: [
      { size: "100g",  price: 65,  costPrice: 57 },
      { size: "250g",  price: 145, costPrice: 127 },
      { size: "500g",  price: 270, costPrice: 237 },
      { size: "1kg",   price: 510, costPrice: 448 },
    ],
  },
  {
    baseName: "Patanjali Honey",
    localName: "पतंजलि शहद",
    brand: "Patanjali", category: "Food & Grocery",
    imageUrl: null,
    variants: [
      { size: "250g",  price: 120, costPrice: 105 },
      { size: "500g",  price: 220, costPrice: 193 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // HAIR OIL
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Bajaj Almond Drops Hair Oil",
    localName: "बजाज आमंड ड्रॉप्स हेयर ऑयल",
    brand: "Bajaj", category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076526_5-bajaj-almond-drops-hair-oil.jpg",
    variants: [
      { size: "50ml",  price: 55,  costPrice: 48 },
      { size: "100ml", price: 95,  costPrice: 83 },
      { size: "200ml", price: 175, costPrice: 153 },
      { size: "300ml", price: 245, costPrice: 215 },
    ],
  },
  {
    baseName: "Navratna Hair Oil",
    localName: "नवरत्न हेयर ऑयल",
    brand: "Emami", category: "Personal Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076527_4-navratna-hair-oil.jpg",
    variants: [
      { size: "50ml",  price: 45,  costPrice: 39 },
      { size: "100ml", price: 80,  costPrice: 70 },
      { size: "200ml", price: 145, costPrice: 127 },
      { size: "300ml", price: 200, costPrice: 175 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // BABY PRODUCTS
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Himalaya Baby Cream",
    localName: "हिमालया बेबी क्रीम",
    brand: "Himalaya", category: "Baby Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076528_3-himalaya-baby-cream.jpg",
    variants: [
      { size: "50ml",  price: 75,  costPrice: 65 },
      { size: "100ml", price: 130, costPrice: 114 },
    ],
  },
  {
    baseName: "Himalaya Baby Lotion",
    localName: "हिमालया बेबी लोशन",
    brand: "Himalaya", category: "Baby Care",
    imageUrl: null,
    variants: [
      { size: "100ml", price: 130, costPrice: 114 },
      { size: "200ml", price: 220, costPrice: 193 },
    ],
  },
  {
    baseName: "Dabur Lal Tail",
    localName: "डाबर लाल तेल",
    brand: "Dabur", category: "Baby Care",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076529_2-dabur-lal-tail.jpg",
    variants: [
      { size: "25ml",  price: 55,  costPrice: 48 },
      { size: "50ml",  price: 95,  costPrice: 83 },
      { size: "100ml", price: 175, costPrice: 153 },
    ],
  },
  {
    baseName: "Dabur Janma Ghunti",
    localName: "डाबर जन्म घुट्टी",
    brand: "Dabur", category: "Baby Care",
    imageUrl: null,
    variants: [
      { size: "120ml", price: 75,  costPrice: 65 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // ROSE WATER & SKIN CARE
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Ayur Rose Water",
    localName: "आयुर गुलाब जल",
    brand: "Ayur", category: "Personal Care",
    imageUrl: null,
    variants: [
      { size: "120ml", price: 45,  costPrice: 39 },
      { size: "200ml", price: 65,  costPrice: 57 },
    ],
  },
  {
    baseName: "Magic Aloe Vera Water",
    localName: "मैजिक एलोवेरा वाटर",
    brand: "Magic", category: "Personal Care",
    imageUrl: null,
    variants: [
      { size: "200ml", price: 60,  costPrice: 52 },
    ],
  },
  {
    baseName: "Roopmantra Face Cream",
    localName: "रूपमंत्रा फेस क्रीम",
    brand: "Roopmantra", category: "Personal Care",
    imageUrl: null,
    variants: [
      { size: "60ml",  price: 80,  costPrice: 70 },
      { size: "120ml", price: 140, costPrice: 122 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // CLEANING PRODUCTS
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Harpic Power Plus Toilet Cleaner",
    localName: "हार्पिक पावर प्लस टॉयलेट क्लीनर",
    brand: "Harpic", category: "Household",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076530_1-harpic-power-plus.jpg",
    variants: [
      { size: "200ml", price: 65,  costPrice: 57 },
      { size: "500ml", price: 130, costPrice: 114 },
      { size: "1L",    price: 220, costPrice: 193 },
    ],
  },
  {
    baseName: "Whitix Glass Cleaner",
    localName: "व्हाइटिक्स ग्लास क्लीनर",
    brand: "Whitix", category: "Household",
    imageUrl: null,
    variants: [
      { size: "500ml", price: 80,  costPrice: 70 },
      { size: "1L",    price: 140, costPrice: 122 },
    ],
  },
  {
    baseName: "Whitix Surface Cleaner",
    localName: "व्हाइटिक्स सर्फेस क्लीनर",
    brand: "Whitix", category: "Household",
    imageUrl: null,
    variants: [
      { size: "500ml", price: 75,  costPrice: 65 },
      { size: "1L",    price: 130, costPrice: 114 },
    ],
  },
  {
    baseName: "Lizol Disinfectant Surface Cleaner",
    localName: "लिज़ोल डिसइन्फेक्टेंट क्लीनर",
    brand: "Lizol", category: "Household",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076531_9-lizol-disinfectant.jpg",
    variants: [
      { size: "500ml", price: 130, costPrice: 114 },
      { size: "1L",    price: 230, costPrice: 202 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // DETERGENT POWDER
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Ghadi Detergent Powder",
    localName: "घड़ी डिटर्जेंट पाउडर",
    brand: "Ghadi", category: "Household",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076532_8-ghadi-detergent-powder.jpg",
    variants: [
      { size: "500g",  price: 55,  costPrice: 48 },
      { size: "1kg",   price: 99,  costPrice: 87 },
      { size: "2kg",   price: 185, costPrice: 162 },
      { size: "5kg",   price: 430, costPrice: 378 },
    ],
  },
  {
    baseName: "Surf Excel Detergent Powder",
    localName: "सर्फ एक्सेल डिटर्जेंट पाउडर",
    brand: "Surf Excel", category: "Household",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076533_7-surf-excel-detergent.jpg",
    variants: [
      { size: "500g",  price: 90,  costPrice: 79 },
      { size: "1kg",   price: 170, costPrice: 149 },
      { size: "2kg",   price: 320, costPrice: 281 },
    ],
  },
  {
    baseName: "Tide Detergent Powder",
    localName: "टाइड डिटर्जेंट पाउडर",
    brand: "Tide", category: "Household",
    imageUrl: null,
    variants: [
      { size: "500g",  price: 75,  costPrice: 65 },
      { size: "1kg",   price: 140, costPrice: 122 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // SHOE POLISH
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Cherry Blossom Liquid Shoe Polish Dark Tan",
    localName: "चेरी ब्लॉसम लिक्विड शू पॉलिश डार्क टैन",
    brand: "Cherry Blossom", category: "Household",
    imageUrl: null,
    variants: [
      { size: "75ml",  price: 85,  costPrice: 74 },
    ],
  },
  {
    baseName: "Cherry Blossom Shoe Polish Tin Black",
    localName: "चेरी ब्लॉसम शू पॉलिश टिन काला",
    brand: "Cherry Blossom", category: "Household",
    imageUrl: null,
    variants: [
      { size: "40g",   price: 45,  costPrice: 39 },
      { size: "80g",   price: 75,  costPrice: 65 },
    ],
  },
  {
    baseName: "Cherry Blossom Shoe Polish Tin Dark Tan",
    localName: "चेरी ब्लॉसम शू पॉलिश टिन डार्क टैन",
    brand: "Cherry Blossom", category: "Household",
    imageUrl: null,
    variants: [
      { size: "40g",   price: 45,  costPrice: 39 },
      { size: "80g",   price: 75,  costPrice: 65 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // AGARBATTI / INCENSE / ROOM FRESHENER
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Kasturi Agarbatti",
    localName: "कस्तूरी अगरबत्ती",
    brand: "Kasturi", category: "Household",
    imageUrl: null,
    variants: [
      { size: "Small Box", price: 20,  costPrice: 17 },
      { size: "Large Box", price: 50,  costPrice: 43 },
    ],
  },
  {
    baseName: "Golden Wood Agarbatti",
    localName: "गोल्डन वुड अगरबत्ती",
    brand: "Golden Wood", category: "Household",
    imageUrl: null,
    variants: [
      { size: "Small Box", price: 20,  costPrice: 17 },
      { size: "Large Box", price: 50,  costPrice: 43 },
    ],
  },
  {
    baseName: "Rocket Room Freshener",
    localName: "रॉकेट रूम फ्रेशनर",
    brand: "Rocket", category: "Household",
    imageUrl: null,
    variants: [
      { size: "Standard", price: 30,  costPrice: 26 },
    ],
  },
  {
    baseName: "Magnet Room Freshener",
    localName: "मैग्नेट रूम फ्रेशनर",
    brand: "Magnet", category: "Household",
    imageUrl: null,
    variants: [
      { size: "Standard", price: 30,  costPrice: 26 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // SHAMPOO
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Ayur Amla Shikakai Shampoo",
    localName: "आयुर आंवला शिकाकाई शैम्पू",
    brand: "Ayur", category: "Personal Care",
    imageUrl: null,
    variants: [
      { size: "100ml", price: 55,  costPrice: 48 },
      { size: "200ml", price: 95,  costPrice: 83 },
      { size: "500ml", price: 210, costPrice: 184 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // BEVERAGES / FOOD
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Tang Orange Drink Mix",
    localName: "टैंग ऑरेंज ड्रिंक मिक्स",
    brand: "Tang", category: "Beverages",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076534_6-tang-orange.jpg",
    variants: [
      { size: "50g",   price: 25,  costPrice: 21 },
      { size: "100g",  price: 45,  costPrice: 39 },
      { size: "500g",  price: 195, costPrice: 171 },
    ],
  },
  {
    baseName: "Cadbury Dairy Milk Chocolate",
    localName: "कैडबरी डेयरी मिल्क चॉकलेट",
    brand: "Cadbury", category: "Confectionery",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/xxl/40076535_5-cadbury-dairy-milk.jpg",
    variants: [
      { size: "13g (₹10)",  price: 10,  costPrice: 8 },
      { size: "36g",        price: 30,  costPrice: 26 },
      { size: "55g",        price: 45,  costPrice: 39 },
    ],
  },
  {
    baseName: "Britannia Toastea Rusk",
    localName: "ब्रिटानिया टोस्टिया रस्क",
    brand: "Britannia", category: "Biscuits",
    imageUrl: null,
    variants: [
      { size: "Single Pack", price: 20,  costPrice: 17 },
      { size: "Family Pack (4 packs)", price: 70, costPrice: 61 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // UJALA / FABRIC WHITENER
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Ujala Supreme Fabric Whitener",
    localName: "उजाला सुप्रीम फैब्रिक व्हाइटनर",
    brand: "Ujala", category: "Household",
    imageUrl: null,
    variants: [
      { size: "75ml",  price: 30,  costPrice: 26 },
      { size: "150ml", price: 55,  costPrice: 48 },
      { size: "250ml", price: 85,  costPrice: 74 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // MISC AYURVEDIC / SPECIALTY
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Kala Bhoot Mosquito Repellent",
    localName: "काला भूत मच्छर भगाने वाला",
    brand: "Kala Bhoot", category: "Household",
    imageUrl: null,
    variants: [
      { size: "Standard", price: 25,  costPrice: 21 },
    ],
  },
  {
    baseName: "Kashu Tulsi Ashtagandha Tika",
    localName: "काशु तुलसी अष्टगंध टीका",
    brand: "Kashu", category: "Household",
    imageUrl: null,
    variants: [
      { size: "Standard", price: 20,  costPrice: 17 },
    ],
  },
  {
    baseName: "Vicks VapoRub",
    localName: "विक्स वेपोरब",
    brand: "Vicks", category: "Personal Care",
    imageUrl: null,
    variants: [
      { size: "10g",   price: 35,  costPrice: 30 },
      { size: "25g",   price: 70,  costPrice: 61 },
      { size: "50g",   price: 120, costPrice: 105 },
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

      const doc_ = {
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
      };

      await addDoc(collection(db, "products"), doc_);
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
