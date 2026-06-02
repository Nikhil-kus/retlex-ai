/**
 * seed-new-shop-sauces-oils.mjs
 * Seeds "New Shop" with all products from the 14 sauce/oil/pickle photos.
 * Run: node scripts/seed-new-shop-sauces-oils.mjs
 */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, query, where, doc, setDoc } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
  storageBucket: "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId: "1:339712048398:web:578ac498b0c942db7aab5f",
});
const db = getFirestore(app);
const SHOP_NAME = "New Shop";

const PRODUCTS = [
  // ── IMAGE 1 & 12: Fun Top Continental Sauce Jerry Can ─────────────────────
  { baseName:"Fun Top Continental Sauce",         localName:"फन टॉप कॉन्टिनेंटल सॉस",          brand:"Fun Top",    category:"Sauces & Condiments", variants:[{size:"700ml",price:80,costPrice:68},{size:"4.5kg Jerry Can",price:290,costPrice:248}] },
  // ── IMAGE 2: Uma Tango Continental Sauce bottles ──────────────────────────
  { baseName:"Uma Tango Continental Sauce",        localName:"उमा टैंगो कॉन्टिनेंटल सॉस",        brand:"Tango",      category:"Sauces & Condiments", variants:[{size:"700ml",price:80,costPrice:68},{size:"5kg Jerry Can",price:225,costPrice:192}] },
  // ── IMAGE 2 & 11: Fun Top Soya Sauce ─────────────────────────────────────
  { baseName:"Fun Top Soya Sauce",                 localName:"फन टॉप सोया सॉस",                  brand:"Fun Top",    category:"Sauces & Condiments", variants:[{size:"700ml",price:85,costPrice:72}] },
  // ── IMAGE 3: Sikka Kachhi Ghani Mustard Oil ───────────────────────────────
  { baseName:"Sikka Kachhi Ghani Mustard Oil",     localName:"सिक्का कच्ची घानी सरसों तेल",      brand:"Sikka",      category:"Oils & Ghee",         variants:[{size:"1L",price:160,costPrice:140},{size:"5L",price:750,costPrice:655},{size:"15L Tin",price:2100,costPrice:1840}] },
  // ── IMAGE 4 & 10: Swadist Refined Soyabean Oil ───────────────────────────
  { baseName:"Swadist Refined Soyabean Oil",       localName:"स्वादिष्ट रिफाइंड सोयाबीन तेल",   brand:"Swadist",    category:"Oils & Ghee",         variants:[{size:"1L",price:130,costPrice:113},{size:"5L",price:610,costPrice:533},{size:"15L Tin",price:1750,costPrice:1530}] },
  // ── IMAGE 4 & 10: Swadist Lite Soyabean Oil ──────────────────────────────
  { baseName:"Swadist Lite Refined Soyabean Oil",  localName:"स्वादिष्ट लाइट रिफाइंड सोयाबीन तेल", brand:"Swadist", category:"Oils & Ghee",         variants:[{size:"5L",price:590,costPrice:515}] },
  // ── IMAGE 5 & 7: Neeraj Garlic Pickle ────────────────────────────────────
  { baseName:"Neeraj Garlic Pickle",               localName:"नीरज लहसुन अचार",                  brand:"Neeraj",     category:"Pickles & Chutneys",  variants:[{size:"200g",price:55,costPrice:47},{size:"500g",price:110,costPrice:95}] },
  // ── IMAGE 5 & 7: Neeraj Green Chilli Pickle ──────────────────────────────
  { baseName:"Neeraj Green Chilli Pickle",         localName:"नीरज हरी मिर्च अचार",              brand:"Neeraj",     category:"Pickles & Chutneys",  variants:[{size:"200g",price:55,costPrice:47},{size:"500g",price:110,costPrice:95}] },
  // ── IMAGE 7: Neeraj Spicy Lemon Pickle ───────────────────────────────────
  { baseName:"Neeraj Spicy Lemon Pickle",          localName:"नीरज स्पाइसी नींबू अचार",          brand:"Neeraj",     category:"Pickles & Chutneys",  variants:[{size:"200g",price:55,costPrice:47},{size:"500g",price:110,costPrice:95}] },
  // ── IMAGE 7: Neeraj Sweet Lemon Pickle ───────────────────────────────────
  { baseName:"Neeraj Sweet Lemon Pickle",          localName:"नीरज स्वीट लेमन अचार",             brand:"Neeraj",     category:"Pickles & Chutneys",  variants:[{size:"200g",price:55,costPrice:47},{size:"500g",price:110,costPrice:95}] },
  // ── IMAGE 7: Ram Bandhu Mixed Pickle ─────────────────────────────────────
  { baseName:"Ram Bandhu Mixed Pickle",            localName:"राम बंधु मिक्स्ड अचार",            brand:"Ram Bandhu", category:"Pickles & Chutneys",  variants:[{size:"200g",price:50,costPrice:43},{size:"500g",price:100,costPrice:87}] },
  // ── IMAGE 7: Nilon's Classic Mixed Pickle ────────────────────────────────
  { baseName:"Nilon's Classic Mixed Pickle",       localName:"निलॉन्स क्लासिक मिक्स्ड अचार",    brand:"Nilon's",    category:"Pickles & Chutneys",  variants:[{size:"200g",price:55,costPrice:47},{size:"500g",price:110,costPrice:95}] },
  // ── IMAGE 7: FnJoy Mixed Pickle ───────────────────────────────────────────
  { baseName:"FnJoy Mixed Pickle",                 localName:"एफएनजॉय मिक्स्ड अचार",             brand:"FnJoy",      category:"Pickles & Chutneys",  variants:[{size:"200g",price:50,costPrice:43},{size:"500g",price:100,costPrice:87}] },
  // ── IMAGE 6: Kriti Refined Sunflower Oil ─────────────────────────────────
  { baseName:"Kriti Refined Sunflower Oil",        localName:"क्रिति रिफाइंड सनफ्लावर ऑयल",     brand:"Kriti",      category:"Oils & Ghee",         variants:[{size:"1L",price:140,costPrice:122},{size:"5L",price:660,costPrice:577},{size:"15L Tin",price:1900,costPrice:1662}] },
  // ── IMAGE 8: Fun Top Green Chilli Sauce ──────────────────────────────────
  { baseName:"Fun Top Green Chilli Sauce",         localName:"फन टॉप ग्रीन चिली सॉस",            brand:"Fun Top",    category:"Sauces & Condiments", variants:[{size:"700ml",price:85,costPrice:72}] },
  // ── IMAGE 8: Winn Pro Chef Green Chilli Sauce ────────────────────────────
  { baseName:"Winn Pro Chef Green Chilli Sauce",   localName:"विन प्रो शेफ ग्रीन चिली सॉस",     brand:"Winn",       category:"Sauces & Condiments", variants:[{size:"650g",price:120,costPrice:105},{size:"700g",price:125,costPrice:109}] },
  // ── IMAGE 9: Winn Pro Chef White Vinegar ─────────────────────────────────
  { baseName:"Winn Pro Chef White Vinegar",        localName:"विन प्रो शेफ व्हाइट विनेगर",       brand:"Winn",       category:"Sauces & Condiments", variants:[{size:"700ml",price:75,costPrice:64}] },
  // ── IMAGE 10: Swadist Premium Groundnut Oil ──────────────────────────────
  { baseName:"Swadist Premium Filtered Groundnut Oil", localName:"स्वादिष्ट प्रीमियम फिल्टर्ड मूंगफली तेल", brand:"Swadist", category:"Oils & Ghee", variants:[{size:"1L",price:180,costPrice:157},{size:"5L",price:840,costPrice:735}] },
  // ── IMAGE 10: Shudh Groundnut Oil ────────────────────────────────────────
  { baseName:"Shudh Filtered Groundnut Oil",       localName:"शुद्ध फिल्टर्ड मूंगफली तेल",       brand:"Shudh",      category:"Oils & Ghee",         variants:[{size:"1L",price:175,costPrice:153},{size:"5L",price:820,costPrice:717}] },
  // ── IMAGE 10: Dhara Groundnut Oil (shelf top) ────────────────────────────
  { baseName:"Dhara Filtered Groundnut Oil",       localName:"धारा फिल्टर्ड मूंगफली तेल",        brand:"Dhara",      category:"Oils & Ghee",         variants:[{size:"1L",price:185,costPrice:162},{size:"2L",price:360,costPrice:315},{size:"5L",price:870,costPrice:761},{size:"15L Tin",price:2450,costPrice:2144}] },
  // ── IMAGE 11: Professional Tomato Ketchup ────────────────────────────────
  { baseName:"Professional Tomato Ketchup",        localName:"प्रोफेशनल टोमेटो केचप",            brand:"Professional", category:"Sauces & Condiments", variants:[{size:"1.2kg",price:130,costPrice:113}] },
  // ── IMAGE 12: Fun Top Red Chilli Sauce Jerry Can ──────────────────────────
  { baseName:"Fun Top Red Chilli Sauce",           localName:"फन टॉप रेड चिली सॉस",              brand:"Fun Top",    category:"Sauces & Condiments", variants:[{size:"700ml",price:85,costPrice:72},{size:"4.5kg Jerry Can",price:290,costPrice:248}] },
  // ── IMAGE 13: Dammani's Premium Filtered Groundnut Oil ───────────────────
  { baseName:"Dammani's Premium Filtered Groundnut Oil", localName:"दम्मानी प्रीमियम फिल्टर्ड मूंगफली तेल", brand:"Dammani Brothers", category:"Oils & Ghee", variants:[{size:"1L",price:180,costPrice:157},{size:"5L",price:840,costPrice:735},{size:"15L Tin",price:2300,costPrice:2012}] },
];

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  New Shop — Sauces, Oils & Pickles Seeder");
  console.log("=".repeat(60) + "\n");

  // Find or create shop
  const shopsSnap = await getDocs(collection(db, "shops"));
  let targetShop = null;
  for (const d of shopsSnap.docs) {
    const n = (d.data().name || "").toLowerCase();
    if (n === "new shop") { targetShop = { id: d.id, ...d.data() }; break; }
  }
  if (!targetShop) {
    console.log("Creating shop: " + SHOP_NAME);
    const qrCodeId = Math.random().toString(36).substring(2,10) + Date.now().toString(36);
    const ref = await addDoc(collection(db, "shops"), {
      name: SHOP_NAME, mobile: "9999999999", address: "Main Market",
      qrCodeId, createdAt: new Date().toISOString(),
    });
    targetShop = { id: ref.id, name: SHOP_NAME };
    console.log("Created: " + SHOP_NAME + " (" + ref.id + ")");
  } else {
    console.log("Found: " + targetShop.name + " (" + targetShop.id + ")");
  }

  const existingSnap = await getDocs(query(collection(db, "products"), where("shopId", "==", targetShop.id)));
  const existingNames = new Set(existingSnap.docs.map(d => (d.data().name || "").toLowerCase().trim()));
  console.log("Existing products: " + existingNames.size + "\n");

  let added = 0, skipped = 0;
  for (const product of PRODUCTS) {
    for (const variant of product.variants) {
      const productName = product.baseName + " " + variant.size;
      const nameKey = productName.toLowerCase().trim();
      if (existingNames.has(nameKey)) { skipped++; continue; }
      await addDoc(collection(db, "products"), {
        name: productName, localName: product.localName || null,
        brand: product.brand || null, category: product.category,
        price: variant.price, costPrice: variant.costPrice,
        baseUnit: "pc", baseQuantity: 1,
        packetWeight: null, packetUnit: null, imageUrl: null,
        shopId: targetShop.id, variant: variant.size,
        createdAt: new Date().toISOString(), source: "photo_ingest",
      });
      existingNames.add(nameKey);
      console.log("  ADDED: " + productName + " @ Rs." + variant.price);
      added++;
      if (product.variants.indexOf(variant) === 0) {
        const gcId = "gc_" + nameKey.replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"").slice(0,60);
        await setDoc(doc(db,"globalCatalog",gcId), {
          name: productName, localName: product.localName||null,
          brand: product.brand||null, category: product.category,
          baseUnit:"pc", baseQuantity:1, price: variant.price,
          imageUrl:null, createdAt: new Date().toISOString(),
          sourceShopId: targetShop.id,
        }, { merge: true });
      }
    }
  }
  console.log("\n" + "-".repeat(60));
  console.log("DONE!  Added: " + added + "  |  Skipped: " + skipped);
  console.log("Total products: " + existingNames.size);
  console.log("Next: node scripts/assign-images-new-shop.mjs");
  console.log("-".repeat(60) + "\n");
  process.exit(0);
}
main().catch(e => { console.error("Fatal:", e); process.exit(1); });
