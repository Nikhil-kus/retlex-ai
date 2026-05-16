/**
 * add-grocery-krishna-shop.mjs
 * Spices, rice, namkeen, instant mixes, condiments, ghee, poly bags,
 * household items — all with size variants from the shop photos.
 * Run: node scripts/add-grocery-krishna-shop.mjs
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
  // SPICES & PASTES
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Okhle Garlic Ginger Paste",
    localName: "ओखले लहसुन अदरक पेस्ट",
    brand: "Okhle Spices", category: "Spices",
    variants: [
      { size: "40g Sachet",  price: 10,  costPrice: 8 },
      { size: "200g",        price: 40,  costPrice: 35 },
      { size: "400g",        price: 75,  costPrice: 65 },
    ],
  },
  {
    baseName: "Ravi Garam Masala",
    localName: "रवि गरम मसाला",
    brand: "Ravi", category: "Spices",
    variants: [
      { size: "10g (₹10)",   price: 10,  costPrice: 8 },
      { size: "50g",         price: 40,  costPrice: 35 },
      { size: "100g",        price: 75,  costPrice: 65 },
      { size: "200g",        price: 140, costPrice: 122 },
    ],
  },
  {
    baseName: "Pushp Chat Masala",
    localName: "पुष्प चाट मसाला",
    brand: "Pushp", category: "Spices",
    variants: [
      { size: "50g",         price: 30,  costPrice: 26 },
      { size: "100g",        price: 55,  costPrice: 48 },
    ],
  },
  {
    baseName: "Aish Masala",
    localName: "आइश मसाला",
    brand: "Aish", category: "Spices",
    variants: [
      { size: "50g",         price: 25,  costPrice: 21 },
      { size: "100g",        price: 45,  costPrice: 39 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // RICE & GRAINS
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Daawat Pulav Basmati Rice",
    localName: "दावत पुलाव बासमती चावल",
    brand: "Daawat", category: "Grains & Pulses",
    variants: [
      { size: "500g",        price: 75,  costPrice: 65 },
      { size: "1kg",         price: 140, costPrice: 122 },
      { size: "5kg",         price: 650, costPrice: 571 },
    ],
  },
  {
    baseName: "Sudarshan Tarbooj Magaj",
    localName: "सुदर्शन तरबूज मगज",
    brand: "Sudarshan", category: "Grains & Pulses",
    variants: [
      { size: "200g",        price: 60,  costPrice: 52 },
      { size: "500g",        price: 140, costPrice: 122 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // NAMKEEN / SNACKS
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Haldiram's Aloo Bhuja Sev",
    localName: "हल्दीराम आलू भुजा सेव",
    brand: "Haldiram's", category: "Snacks",
    variants: [
      { size: "150g",        price: 50,  costPrice: 43 },
      { size: "400g",        price: 120, costPrice: 105 },
      { size: "1kg",         price: 280, costPrice: 246 },
    ],
  },
  {
    baseName: "Mohan Raita Boondi",
    localName: "मोहन रायता बूंदी",
    brand: "Mohan", category: "Snacks",
    variants: [
      { size: "200g",        price: 40,  costPrice: 35 },
      { size: "500g",        price: 90,  costPrice: 79 },
    ],
  },
  {
    baseName: "Nice Namkeen Mixture",
    localName: "नाइस नमकीन मिक्सचर",
    brand: "Nice", category: "Snacks",
    variants: [
      { size: "200g",        price: 40,  costPrice: 35 },
      { size: "500g",        price: 90,  costPrice: 79 },
    ],
  },
  {
    baseName: "Barik Sev Namkeen",
    localName: "बारीक सेव नमकीन",
    brand: "Local", category: "Snacks",
    variants: [
      { size: "200g",        price: 35,  costPrice: 30 },
      { size: "500g",        price: 80,  costPrice: 70 },
    ],
  },
  {
    baseName: "Kundan Namkeen",
    localName: "कुंदन नमकीन",
    brand: "Kundan", category: "Snacks",
    variants: [
      { size: "200g",        price: 40,  costPrice: 35 },
      { size: "500g",        price: 90,  costPrice: 79 },
    ],
  },
  {
    baseName: "A-1 Namkeen",
    localName: "ए-1 नमकीन",
    brand: "A-1", category: "Snacks",
    variants: [
      { size: "200g",        price: 40,  costPrice: 35 },
      { size: "500g",        price: 90,  costPrice: 79 },
    ],
  },
  {
    baseName: "Magic Masala Chana",
    localName: "मैजिक मसाला चना",
    brand: "Magic", category: "Snacks",
    variants: [
      { size: "200g",        price: 35,  costPrice: 30 },
      { size: "500g",        price: 80,  costPrice: 70 },
    ],
  },
  {
    baseName: "Royal Chana",
    localName: "रॉयल चना",
    brand: "Royal", category: "Snacks",
    variants: [
      { size: "200g",        price: 35,  costPrice: 30 },
      { size: "500g",        price: 80,  costPrice: 70 },
    ],
  },
  {
    baseName: "Roastman Chana Hing Jeera",
    localName: "रोस्टमैन चना हींग जीरा",
    brand: "Roastman", category: "Snacks",
    variants: [
      { size: "200g",        price: 40,  costPrice: 35 },
      { size: "500g",        price: 90,  costPrice: 79 },
    ],
  },
  {
    baseName: "Saffola Oats",
    localName: "सफोला ओट्स",
    brand: "Saffola", category: "Snacks",
    variants: [
      { size: "400g",        price: 130, costPrice: 114 },
      { size: "1kg",         price: 290, costPrice: 255 },
    ],
  },
  {
    baseName: "Kellogg's Multigrain Choco",
    localName: "केलॉग्स मल्टीग्रेन चोको",
    brand: "Kellogg's", category: "Snacks",
    variants: [
      { size: "375g",        price: 220, costPrice: 193 },
      { size: "700g",        price: 390, costPrice: 342 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // INSTANT MIXES
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Gits Rose Falooda Instant Mix",
    localName: "गिट्स रोज फालूदा इंस्टेंट मिक्स",
    brand: "Gits", category: "Food & Grocery",
    variants: [
      { size: "200g",        price: 75,  costPrice: 65 },
    ],
  },
  {
    baseName: "Gits Gulab Jamun Instant Mix",
    localName: "गिट्स गुलाब जामुन इंस्टेंट मिक्स",
    brand: "Gits", category: "Food & Grocery",
    variants: [
      { size: "200g",        price: 75,  costPrice: 65 },
    ],
  },
  {
    baseName: "Gits Dahivada Instant Mix",
    localName: "गिट्स दहीवड़ा इंस्टेंट मिक्स",
    brand: "Gits", category: "Food & Grocery",
    variants: [
      { size: "200g",        price: 75,  costPrice: 65 },
    ],
  },
  {
    baseName: "Agrawal's 420 Idli Instant Mix",
    localName: "अग्रवाल 420 इडली इंस्टेंट मिक्स",
    brand: "Agrawal's 420", category: "Food & Grocery",
    variants: [
      { size: "200g",        price: 55,  costPrice: 48 },
      { size: "500g",        price: 120, costPrice: 105 },
    ],
  },
  {
    baseName: "Agrawal's 420 Dahi Vada Instant Mix",
    localName: "अग्रवाल 420 दही वड़ा इंस्टेंट मिक्स",
    brand: "Agrawal's 420", category: "Food & Grocery",
    variants: [
      { size: "200g",        price: 55,  costPrice: 48 },
    ],
  },
  {
    baseName: "Agrawal's 420 Khaman Instant Mix",
    localName: "अग्रवाल 420 खमन इंस्टेंट मिक्स",
    brand: "Agrawal's 420", category: "Food & Grocery",
    variants: [
      { size: "200g",        price: 55,  costPrice: 48 },
    ],
  },
  {
    baseName: "Gangaram Rice Idli Instant Mix",
    localName: "गंगाराम राइस इडली इंस्टेंट मिक्स",
    brand: "Gangaram", category: "Food & Grocery",
    variants: [
      { size: "200g",        price: 55,  costPrice: 48 },
    ],
  },
  {
    baseName: "Weikfield Falooda Mix Rose",
    localName: "वेकफील्ड फालूदा मिक्स रोज",
    brand: "Weikfield", category: "Food & Grocery",
    variants: [
      { size: "75g",         price: 50,  costPrice: 43 },
      { size: "200g",        price: 90,  costPrice: 79 },
    ],
  },
  {
    baseName: "Charpy Falooda Mix Kesar Pista",
    localName: "चार्पी फालूदा मिक्स केसर पिस्ता",
    brand: "Charpy", category: "Food & Grocery",
    variants: [
      { size: "100g",        price: 55,  costPrice: 48 },
    ],
  },
  {
    baseName: "Agrawal's 420 Papad",
    localName: "अग्रवाल 420 पापड़",
    brand: "Agrawal's 420", category: "Food & Grocery",
    variants: [
      { size: "200g",        price: 40,  costPrice: 35 },
      { size: "400g",        price: 75,  costPrice: 65 },
    ],
  },
  {
    baseName: "Lijjat Papad",
    localName: "लिज्जत पापड़",
    brand: "Lijjat", category: "Food & Grocery",
    variants: [
      { size: "200g",        price: 50,  costPrice: 43 },
      { size: "400g",        price: 95,  costPrice: 83 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // CONDIMENTS & SAUCES
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Surabhi Tomato Ketchup",
    localName: "सुरभि टोमेटो केचप",
    brand: "Surabhi", category: "Food & Grocery",
    variants: [
      { size: "200g",        price: 45,  costPrice: 39 },
      { size: "500g",        price: 95,  costPrice: 83 },
    ],
  },
  {
    baseName: "Obrill's Sweet Chilli Chutney",
    localName: "ओब्रिल्स स्वीट चिली चटनी",
    brand: "Obrill's", category: "Food & Grocery",
    variants: [
      { size: "300g",        price: 80,  costPrice: 70 },
    ],
  },
  {
    baseName: "Winn Pro Chef Dark Soya Sauce",
    localName: "विन प्रो शेफ डार्क सोया सॉस",
    brand: "Winn", category: "Food & Grocery",
    variants: [
      { size: "700ml",       price: 120, costPrice: 105 },
    ],
  },
  {
    baseName: "Taste Master Red Chilli Sauce",
    localName: "टेस्ट मास्टर रेड चिली सॉस",
    brand: "Taste Master", category: "Food & Grocery",
    variants: [
      { size: "200g",        price: 55,  costPrice: 48 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // GHEE
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Dhotpur Fresh Desi Ghee",
    localName: "धोतपुर फ्रेश देसी घी",
    brand: "Dhotpur", category: "Dairy",
    variants: [
      { size: "500ml",       price: 280, costPrice: 246 },
      { size: "1L",          price: 540, costPrice: 474 },
    ],
  },
  {
    baseName: "Gowardhan Ghee",
    localName: "गोवर्धन घी",
    brand: "Gowardhan", category: "Dairy",
    variants: [
      { size: "200ml",       price: 130, costPrice: 114 },
      { size: "500ml",       price: 300, costPrice: 263 },
      { size: "1L",          price: 580, costPrice: 509 },
    ],
  },
  {
    baseName: "Desh Ghee",
    localName: "देश घी",
    brand: "Desh", category: "Dairy",
    variants: [
      { size: "200ml",       price: 110, costPrice: 96 },
      { size: "500ml",       price: 260, costPrice: 228 },
      { size: "1L",          price: 500, costPrice: 439 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // POLY BAGS (wholesale item — sold to other shops)
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Radha Poly Bags",
    localName: "राधा पॉली बैग",
    brand: "Radha", category: "Household",
    variants: [
      { size: "Small (100 pcs)",   price: 30,  costPrice: 25 },
      { size: "Medium (100 pcs)",  price: 45,  costPrice: 38 },
      { size: "Large (100 pcs)",   price: 60,  costPrice: 51 },
    ],
  },
  {
    baseName: "Pakona Pick-up Bags",
    localName: "पकोना पिक-अप बैग",
    brand: "Pakona", category: "Household",
    variants: [
      { size: "1kg Pack",          price: 55,  costPrice: 47 },
    ],
  },
  {
    baseName: "Okay Poly Bag",
    localName: "ओके पॉली बैग",
    brand: "Okay", category: "Household",
    variants: [
      { size: "Small Pack",        price: 30,  costPrice: 25 },
      { size: "Large Pack",        price: 55,  costPrice: 47 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // HOUSEHOLD / HANDWASH / LAUNDRY
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Dettol Original Liquid Handwash Refill",
    localName: "डेटॉल ओरिजिनल लिक्विड हैंडवॉश रिफिल",
    brand: "Dettol", category: "Personal Care",
    variants: [
      { size: "175ml",       price: 65,  costPrice: 57 },
      { size: "750ml Refill", price: 195, costPrice: 171 },
    ],
  },
  {
    baseName: "Vanish Oxi Action Stain Remover",
    localName: "वैनिश ऑक्सी एक्शन स्टेन रिमूवर",
    brand: "Vanish", category: "Household",
    variants: [
      { size: "100g",        price: 75,  costPrice: 65 },
      { size: "400g",        price: 250, costPrice: 219 },
    ],
  },
  {
    baseName: "Vim Dishwash Liquid",
    localName: "विम डिशवॉश लिक्विड",
    brand: "Vim", category: "Household",
    variants: [
      { size: "250ml",       price: 55,  costPrice: 48 },
      { size: "500ml",       price: 100, costPrice: 87 },
      { size: "1L",          price: 185, costPrice: 162 },
    ],
  },
  {
    baseName: "Golden Wet Dab Stain Remover",
    localName: "गोल्डन वेट डैब स्टेन रिमूवर",
    brand: "Golden", category: "Household",
    variants: [
      { size: "Standard",    price: 30,  costPrice: 26 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // TEA (additional brand seen)
  // ══════════════════════════════════════════════════════════════════
  {
    baseName: "Lamsa Export Quality Tea",
    localName: "लम्सा एक्सपोर्ट क्वालिटी चाय",
    brand: "Lamsa", category: "Beverages",
    variants: [
      { size: "100g",        price: 50,  costPrice: 43 },
      { size: "250g",        price: 115, costPrice: 100 },
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
