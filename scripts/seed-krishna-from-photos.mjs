/**
 * seed-krishna-from-photos.mjs
 * Creates "Shri Krishna Kirana and General Store" shop (if not exists)
 * then seeds ALL products identified from the 12 shop photos.
 * Run: node scripts/seed-krishna-from-photos.mjs
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
const SHOP_NAME = "Shri Krishna Kirana and General Store";

const PRODUCTS = [
  // ── IMAGE 1: Flour & Instant Mix shelf ──────────────────────
  { baseName:"Silver Coin Mota Besan",          localName:"सिल्वर कॉइन मोटा बेसन",                brand:"Silver Coin",   category:"Flours & Grains",           variants:[{size:"500g",price:45,costPrice:39},{size:"1kg",price:85,costPrice:74},{size:"5kg",price:400,costPrice:350}] },
  { baseName:"Mahara Besan",                    localName:"महारा बेसन",                            brand:"Mahara",        category:"Flours & Grains",           variants:[{size:"500g",price:42,costPrice:36},{size:"1kg",price:80,costPrice:70}] },
  { baseName:"Bubble Daliya",                   localName:"बबल दलिया",                             brand:"Bubble",        category:"Flours & Grains",           variants:[{size:"500g",price:35,costPrice:30},{size:"1kg",price:65,costPrice:57}] },
  { baseName:"Silver Coin Daliya",              localName:"सिल्वर कॉइन दलिया",                    brand:"Silver Coin",   category:"Flours & Grains",           variants:[{size:"500g",price:35,costPrice:30},{size:"1kg",price:65,costPrice:57}] },
  { baseName:"Silver Coin Missi Roti Atta",     localName:"सिल्वर कॉइन मिस्सी रोटी आटा",          brand:"Silver Coin",   category:"Flours & Grains",           variants:[{size:"500g",price:40,costPrice:35},{size:"1kg",price:75,costPrice:65},{size:"5kg",price:360,costPrice:315}] },
  // ── IMAGE 2: India Gate Basmati Rice ────────────────────────
  { baseName:"India Gate Pure Basmati Rice Tibar", localName:"इंडिया गेट प्योर बासमती चावल तिबार", brand:"India Gate",    category:"Rice & Grains",             variants:[{size:"1kg",price:120,costPrice:105},{size:"5kg",price:570,costPrice:500},{size:"10kg",price:1100,costPrice:965}] },
  // ── IMAGE 3: Zeeba Basmati Rice ─────────────────────────────
  { baseName:"Zeeba Everyday Super Mongra Basmati Rice", localName:"जीबा एवरीडे सुपर मोंगरा बासमती चावल", brand:"Zeeba", category:"Rice & Grains",             variants:[{size:"1kg",price:95,costPrice:83},{size:"5kg",price:450,costPrice:395}] },
  // ── IMAGE 4: Sudarshan Tarbooj Magaj ────────────────────────
  { baseName:"Sudarshan Tarbooj Magaj",         localName:"सुदर्शन तरबूज मगज",                    brand:"Sudarshan",     category:"Dry Fruits & Seeds",        variants:[{size:"200g",price:60,costPrice:52},{size:"500g",price:140,costPrice:122},{size:"1kg",price:270,costPrice:237}] },
  // ── IMAGE 5: Sauces & Condiments shelf ──────────────────────
  { baseName:"Charpy Falooda Mix Kesar Pista",  localName:"चार्पी फालूदा मिक्स केसर पिस्ता",      brand:"Charpy",        category:"Instant Mixes & Desserts",  variants:[{size:"100g",price:55,costPrice:48}] },
  { baseName:"Winn Pro Chef Dark Soya Savoury Sauce", localName:"विन प्रो शेफ डार्क सोया सॉस",   brand:"Winn",          category:"Sauces & Condiments",       variants:[{size:"700ml",price:120,costPrice:105}] },
  { baseName:"Taste Master Red Chilli Sauce",   localName:"टेस्ट मास्टर रेड चिली सॉस",            brand:"Taste Master",  category:"Sauces & Condiments",       variants:[{size:"200g",price:55,costPrice:48}] },
  { baseName:"Obrill's Sweet Chilli Chutney",   localName:"ओब्रिल्स स्वीट चिली चटनी",             brand:"Obrill's",      category:"Sauces & Condiments",       variants:[{size:"300g",price:80,costPrice:70}] },
  { baseName:"Surabhi Classic Tomato Ketchup",  localName:"सुरभि क्लासिक टोमेटो केचप",            brand:"Surabhi",       category:"Sauces & Condiments",       variants:[{size:"200g",price:45,costPrice:39},{size:"500g",price:95,costPrice:83},{size:"1kg",price:175,costPrice:153}] },
  { baseName:"Pushpa Jal Jeera Masala",         localName:"पुष्पा जल जीरा मसाला",                 brand:"Pushpa",        category:"Spices & Masalas",          variants:[{size:"50g Sachet",price:10,costPrice:8},{size:"100g",price:18,costPrice:15}] },
  { baseName:"Weikfield Falooda Mix Rose",      localName:"वेकफील्ड फालूदा मिक्स रोज",            brand:"Weikfield",     category:"Instant Mixes & Desserts",  variants:[{size:"75g",price:50,costPrice:43},{size:"200g",price:90,costPrice:79}] },
  // ── IMAGE 6 & 9: Royal Ratan Sachamoti Sabudana ─────────────
  { baseName:"Royal Ratan Sachamoti Premium Tapioca Sago", localName:"रॉयल रतन सच्चामोती प्रीमियम साबूदाना", brand:"Royal Ratan", category:"Rice & Grains", variants:[{size:"500g",price:55,costPrice:48},{size:"1kg",price:100,costPrice:87}] },
  // ── IMAGE 7: Instant Mix shelf (South Indian / Gujarati) ────
  { baseName:"Agrawal's 420 Dahivada Instant Mix",      localName:"अग्रवाल 420 दहीवड़ा इंस्टेंट मिक्स",    brand:"Agrawal's 420", category:"Instant Mixes & Desserts", variants:[{size:"200g",price:55,costPrice:48},{size:"500g",price:120,costPrice:105}] },
  { baseName:"Agrawal's 420 Idli Instant Mix",          localName:"अग्रवाल 420 इडली इंस्टेंट मिक्स",       brand:"Agrawal's 420", category:"Instant Mixes & Desserts", variants:[{size:"200g",price:55,costPrice:48},{size:"500g",price:120,costPrice:105}] },
  { baseName:"Agrawal's 420 Dahi Vada Instant Mix",     localName:"अग्रवाल 420 दही वड़ा इंस्टेंट मिक्स",   brand:"Agrawal's 420", category:"Instant Mixes & Desserts", variants:[{size:"200g",price:55,costPrice:48}] },
  { baseName:"Agrawal's 420 Khaman Dhokla Instant Mix", localName:"अग्रवाल 420 खमन ढोकला इंस्टेंट मिक्स",  brand:"Agrawal's 420", category:"Instant Mixes & Desserts", variants:[{size:"200g",price:55,costPrice:48},{size:"500g",price:120,costPrice:105}] },
  { baseName:"Gangaram Rice Idli Instant Mix",          localName:"गंगाराम राइस इडली इंस्टेंट मिक्स",      brand:"Gangaram",      category:"Instant Mixes & Desserts", variants:[{size:"200g",price:55,costPrice:48}] },
  // ── IMAGE 8: Personal Care (hair color bins) ────────────────
  { baseName:"Garnier Color Naturals Hair Color Sachet", localName:"गार्नियर कलर नेचुरल्स हेयर कलर सैशे", brand:"Garnier",  category:"Personal Care & Beauty",    variants:[{size:"Single Sachet",price:15,costPrice:12},{size:"Box of 10",price:140,costPrice:120}] },
  { baseName:"Nisha Natural Hair Color Sachet",          localName:"निशा नेचुरल हेयर कलर सैशे",           brand:"Nisha",    category:"Personal Care & Beauty",    variants:[{size:"Single Sachet",price:10,costPrice:8},{size:"Box of 10",price:90,costPrice:75}] },
  { baseName:"Gillette Shaving Blade",                   localName:"जिलेट शेविंग ब्लेड",                   brand:"Gillette", category:"Personal Care & Beauty",    variants:[{size:"Single",price:15,costPrice:12},{size:"Pack of 5",price:65,costPrice:55}] },
  // ── IMAGE 9: Amol HDPE Pick Up Bags ─────────────────────────
  { baseName:"Amol HDPE Pick Up Bags",          localName:"अमोल एचडीपीई पिक अप बैग",               brand:"Amol",          category:"Household & Packaging",     variants:[{size:"9x13 1kg Pack",price:80,costPrice:68},{size:"Small Bundle",price:30,costPrice:25}] },
  // ── IMAGE 10: Snack Instant Mix shelf ───────────────────────
  { baseName:"Jalati Idli Mix",                 localName:"जलाती इडली मिक्स",                      brand:"Jalati",        category:"Instant Mixes & Desserts",  variants:[{size:"200g",price:50,costPrice:43},{size:"500g",price:110,costPrice:96}] },
  { baseName:"Utsav Moong Bhajiya Mix",         localName:"उत्सव मूंग भजिया मिक्स",                brand:"Utsav",         category:"Instant Mixes & Desserts",  variants:[{size:"400g",price:75,costPrice:65}] },
  { baseName:"Signam Chakli Instant Mix",       localName:"सिग्नम चकली इंस्टेंट मिक्स",            brand:"Signam",        category:"Instant Mixes & Desserts",  variants:[{size:"500g",price:80,costPrice:70}] },
  { baseName:"Khaman Dhokla Instant Mix",       localName:"खमन ढोकला इंस्टेंट मिक्स",              brand:"Generic",       category:"Instant Mixes & Desserts",  variants:[{size:"500g",price:80,costPrice:70}] },
  { baseName:"Agrawal's 420 Moong Bhajiya Instant Mix", localName:"अग्रवाल 420 मूंग भजिया इंस्टेंट मिक्स", brand:"Agrawal's 420", category:"Instant Mixes & Desserts", variants:[{size:"200g",price:55,costPrice:48}] },
  // ── IMAGE 11: Henna rack + misc ─────────────────────────────
  { baseName:"Amina Henna Natural Black",       localName:"अमीना हेना नेचुरल ब्लैक",               brand:"Amina",         category:"Personal Care & Beauty",    variants:[{size:"Single Sachet",price:10,costPrice:8},{size:"Box of 12",price:110,costPrice:95}] },
  { baseName:"Patanjali Corn Flakes",           localName:"पतंजलि कॉर्न फ्लेक्स",                  brand:"Patanjali",     category:"Breakfast & Cereals",       variants:[{size:"200g",price:55,costPrice:48},{size:"500g",price:120,costPrice:105}] },
  { baseName:"Veg Manchurian Masala Mix",       localName:"वेज मंचूरियन मसाला मिक्स",              brand:"Generic",       category:"Instant Mixes & Desserts",  variants:[{size:"50g Sachet",price:15,costPrice:12},{size:"100g",price:28,costPrice:24}] },
  // ── IMAGE 12: Ghee & Namkeen shelf ──────────────────────────
  { baseName:"Patanjali Cow's Ghee",            localName:"पतंजलि गाय का घी",                      brand:"Patanjali",     category:"Oils & Ghee",               variants:[{size:"200ml",price:130,costPrice:114},{size:"500ml",price:300,costPrice:263},{size:"1L",price:580,costPrice:509}] },
  { baseName:"Gowardhan Desi Ghee",             localName:"गोवर्धन देसी घी",                       brand:"Gowardhan",     category:"Oils & Ghee",               variants:[{size:"200ml",price:130,costPrice:114},{size:"500ml",price:300,costPrice:263},{size:"1L",price:580,costPrice:509}] },
  { baseName:"Paras Premium Desi Ghee",         localName:"पारस प्रीमियम देसी घी",                 brand:"Paras",         category:"Oils & Ghee",               variants:[{size:"200ml",price:125,costPrice:110},{size:"500ml",price:290,costPrice:254},{size:"1L",price:560,costPrice:491}] },
  { baseName:"Nice Namkeen Khata Mitha Mix",    localName:"नाइस नमकीन खट्टा मीठा मिक्स",           brand:"Nice",          category:"Snacks & Namkeen",          variants:[{size:"200g",price:40,costPrice:35},{size:"500g",price:90,costPrice:79}] },
  { baseName:"Nice Namkeen Indori Sev",         localName:"नाइस नमकीन इंदौरी सेव",                 brand:"Nice",          category:"Snacks & Namkeen",          variants:[{size:"200g",price:40,costPrice:35},{size:"500g",price:90,costPrice:79}] },
  { baseName:"Nice Namkeen Ujjaini Sev",        localName:"नाइस नमकीन उज्जैनी सेव",                brand:"Nice",          category:"Snacks & Namkeen",          variants:[{size:"200g",price:40,costPrice:35},{size:"500g",price:90,costPrice:79}] },
  { baseName:"Nice Namkeen Shahi Mix",          localName:"नाइस नमकीन शाही मिक्स",                 brand:"Nice",          category:"Snacks & Namkeen",          variants:[{size:"200g",price:40,costPrice:35},{size:"500g",price:90,costPrice:79}] },
  { baseName:"Lijjat Papad",                    localName:"लिज्जत पापड़",                           brand:"Lijjat",        category:"Snacks & Namkeen",          variants:[{size:"200g",price:50,costPrice:43},{size:"400g",price:95,costPrice:83}] },
];

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Shri Krishna Kirana and General Store — Product Seeder");
  console.log("=".repeat(60) + "\n");

  // 1. Find or create the shop
  const shopsSnap = await getDocs(collection(db, "shops"));
  let targetShop = null;
  for (const d of shopsSnap.docs) {
    if ((d.data().name || "").toLowerCase().includes("krishna")) {
      targetShop = { id: d.id, ...d.data() };
      break;
    }
  }

  if (!targetShop) {
    console.log("Shop not found — creating...");
    const qrCodeId = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const ref = await addDoc(collection(db, "shops"), {
      name: SHOP_NAME, mobile: "9999999999", address: "Main Market",
      qrCodeId, createdAt: new Date().toISOString(),
    });
    targetShop = { id: ref.id, name: SHOP_NAME };
    console.log("Created: " + SHOP_NAME + " (" + ref.id + ")");
  } else {
    console.log("Found: " + targetShop.name + " (" + targetShop.id + ")");
  }

  // 2. Load existing names to skip duplicates
  const existingSnap = await getDocs(
    query(collection(db, "products"), where("shopId", "==", targetShop.id))
  );
  const existingNames = new Set(
    existingSnap.docs.map(d => (d.data().name || "").toLowerCase().trim())
  );
  console.log("Existing products: " + existingNames.size + "\n");

  let added = 0, skipped = 0;

  for (const product of PRODUCTS) {
    for (const variant of product.variants) {
      const productName = product.baseName + " " + variant.size;
      const nameKey = productName.toLowerCase().trim();

      if (existingNames.has(nameKey)) { skipped++; continue; }

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
        source: "photo_ingest",
      });
      existingNames.add(nameKey);
      console.log("  ADDED: " + productName + " @ Rs." + variant.price);
      added++;

      // Upsert first variant to globalCatalog
      if (product.variants.indexOf(variant) === 0) {
        const gcId = "gc_" + nameKey.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 60);
        await setDoc(doc(db, "globalCatalog", gcId), {
          name: productName, localName: product.localName || null,
          brand: product.brand || null, category: product.category,
          baseUnit: "pc", baseQuantity: 1, price: variant.price,
          imageUrl: null, createdAt: new Date().toISOString(),
          sourceShopId: targetShop.id,
        }, { merge: true });
      }
    }
  }

  console.log("\n" + "-".repeat(60));
  console.log("DONE!  Added: " + added + "  |  Skipped: " + skipped);
  console.log("Total products in shop: " + existingNames.size);
  console.log("\nNext: node scripts/assign-images-krishna-photos.mjs");
  console.log("-".repeat(60) + "\n");
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
