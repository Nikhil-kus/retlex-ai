/**
 * seed-new-shop-batch2.mjs
 * Adds all products from the 20 new shop photos (noodles, cleaning, spices,
 * coconut, snacks, confectionery, flours, incense, masalas).
 * Run: node scripts/seed-new-shop-batch2.mjs
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

const PRODUCTS = [
  // ── IMG 1: Maggi Veg Atta Noodles ────────────────────────────────────────
  { baseName:"Maggi Veg Atta Noodles",              localName:"मैगी वेज आटा नूडल्स",              brand:"Maggi",            category:"Instant Foods & Noodles",  variants:[{size:"Single 70g",price:14,costPrice:12},{size:"Pack of 4 (280g)",price:52,costPrice:45}] },
  // ── IMG 2: Whitix Toilet Cleaner ─────────────────────────────────────────
  { baseName:"Whitix Toilet Cleaner",               localName:"व्हिटिक्स टॉयलेट क्लीनर",          brand:"Whitix",           category:"Household Cleaning",        variants:[{size:"500ml",price:55,costPrice:47},{size:"1L",price:95,costPrice:82},{size:"5L Jerry Can",price:380,costPrice:330}] },
  // ── IMG 3: Yippee Magic Masala Noodles ───────────────────────────────────
  { baseName:"Sunfeast Yippee Magic Masala Noodles",localName:"सनफीस्ट यिप्पी मैजिक मसाला नूडल्स",brand:"Sunfeast Yippee",  category:"Instant Foods & Noodles",  variants:[{size:"Single 70g",price:14,costPrice:12},{size:"Pack of 6 (420g)",price:78,costPrice:68}] },
  // ── IMG 4 & 5: AVI Soya Chunks ───────────────────────────────────────────
  { baseName:"AVI Soya Chunks",                     localName:"एवीआई सोया चंक्स (सोया बड़ी)",      brand:"AVI",              category:"Pulses & Protein",          variants:[{size:"45g",price:10,costPrice:8},{size:"200g",price:38,costPrice:33},{size:"500g",price:85,costPrice:74}] },
  // ── IMG 5: Patanjali Corn Flakes (small pack) ────────────────────────────
  { baseName:"Patanjali Corn Flakes",               localName:"पतंजलि कॉर्न फ्लेक्स",             brand:"Patanjali",        category:"Breakfast & Cereals",       variants:[{size:"Rs.10 Sachet",price:10,costPrice:8},{size:"200g",price:55,costPrice:48},{size:"500g",price:120,costPrice:105}] },
  // ── IMG 5: Keya Mixed Herbs ──────────────────────────────────────────────
  { baseName:"Keya Mixed Herbs",                    localName:"केया मिक्स्ड हर्ब्स",               brand:"Keya",             category:"Spices & Masalas",          variants:[{size:"25g Sachet",price:25,costPrice:21},{size:"50g",price:45,costPrice:39}] },
  // ── IMG 6: Starzing Mutton Masala ────────────────────────────────────────
  { baseName:"Starzing Mutton Masala",              localName:"स्टारजिंग मटन मसाला",               brand:"Starzing",         category:"Spices & Masalas",          variants:[{size:"100g",price:55,costPrice:47},{size:"500g",price:220,costPrice:192}] },
  // ── IMG 7: Babuji Premium Jeeravan Powder ────────────────────────────────
  { baseName:"Babuji Premium Jeeravan Powder",      localName:"बाबूजी प्रीमियम जीरावन पाउडर",     brand:"Babuji Spices",    category:"Spices & Masalas",          variants:[{size:"50g",price:25,costPrice:21},{size:"100g",price:45,costPrice:39},{size:"200g",price:85,costPrice:74}] },
  // ── IMG 8: Chatkeens Masala Chana Dal ────────────────────────────────────
  { baseName:"Chatkeens Masala Chana Dal",          localName:"चटकीन्स मसाला चना दाल",             brand:"Chatkeens",        category:"Snacks & Namkeen",          variants:[{size:"150g",price:30,costPrice:25},{size:"400g",price:70,costPrice:61}] },
  // ── IMG 9 & 14: Dhanalakshmi Kamal Desiccated Coconut Powder ─────────────
  { baseName:"Dhanalakshmi Kamal Desiccated Coconut Powder", localName:"धनलक्ष्मी कमल डेसिकेटेड नारियल पाउडर", brand:"Dhanalakshmi Kamal", category:"Baking & Cooking", variants:[{size:"200g",price:55,costPrice:47},{size:"500g",price:120,costPrice:105},{size:"1kg",price:220,costPrice:192}] },
  // ── IMG 10: Camp Denim Gold Dhoop ────────────────────────────────────────
  { baseName:"Camp Denim Gold Dhoop",               localName:"कैम्प डेनिम गोल्ड धूप",             brand:"Camp",             category:"Pooja & Incense",           variants:[{size:"Single Box",price:30,costPrice:25},{size:"Box of 12",price:320,costPrice:280}] },
  // ── IMG 11: Kamal Falahari Rajgira Atta ──────────────────────────────────
  { baseName:"Kamal Falahari Rajgira Atta",         localName:"कमल फलाहारी राजगीरा आटा",           brand:"Kamal",            category:"Flours & Grains",           variants:[{size:"200g",price:45,costPrice:39},{size:"500g",price:100,costPrice:87},{size:"1kg",price:185,costPrice:162}] },
  // ── IMG 12: Kamal Om Ragi Flour ──────────────────────────────────────────
  { baseName:"Kamal Om Ragi Flour",                 localName:"कमल ओम रागी आटा",                   brand:"Kamal Om",         category:"Flours & Grains",           variants:[{size:"200g",price:40,costPrice:35},{size:"500g",price:90,costPrice:79},{size:"1kg",price:165,costPrice:144}] },
  // ── IMG 13: Parle Orange Bite Candy ──────────────────────────────────────
  { baseName:"Parle Orange Bite Candy",             localName:"पार्ले ऑरेंज बाइट कैंडी",           brand:"Parle",            category:"Confectionery & Sweets",    variants:[{size:"Single",price:1,costPrice:0.8},{size:"Bulk Bag 100 pcs",price:80,costPrice:68}] },
  // ── IMG 15: Parle 2-in-1 Eclairs ─────────────────────────────────────────
  { baseName:"Parle 2-in-1 Eclairs",                localName:"पार्ले 2-इन-1 एक्लेयर्स",           brand:"Parle",            category:"Confectionery & Sweets",    variants:[{size:"Single",price:2,costPrice:1.5},{size:"Rs.50 Bag",price:50,costPrice:42}] },
  // ── IMG 16 & last: Kakaji Super Fine Shredded Coconut Copra ──────────────
  { baseName:"Kakaji Super Fine Shredded Coconut Copra", localName:"काकाजी सुपर फाइन श्रेडेड नारियल खोपरा", brand:"Kakaji", category:"Baking & Cooking",         variants:[{size:"200g",price:65,costPrice:56},{size:"500g",price:145,costPrice:127},{size:"1kg",price:270,costPrice:236}] },
  // ── IMG 17: Starzing Skylex Black Chinese Pepper Masala ──────────────────
  { baseName:"Starzing Skylex Black Chinese Pepper Masala", localName:"स्टारजिंग स्काईलेक्स ब्लैक चाइनीज पेपर मसाला", brand:"Starzing", category:"Spices & Masalas", variants:[{size:"100g",price:55,costPrice:47},{size:"800g",price:380,costPrice:332}] },
  // ── IMG 18: Peekay Fresh Potato Chips with Rock Salt ─────────────────────
  { baseName:"Peekay Fresh Potato Chips Rock Salt",  localName:"पीकेय फ्रेश पोटैटो चिप्स रॉक सॉल्ट", brand:"Peekay",          category:"Snacks & Namkeen",          variants:[{size:"100g",price:30,costPrice:25},{size:"250g",price:80,costPrice:68}] },
  // ── IMG 19: Guru Desiccated Coconut Powder ───────────────────────────────
  { baseName:"Guru Desiccated Coconut Powder",       localName:"गुरु डेसिकेटेड नारियल पाउडर",      brand:"Guru",             category:"Baking & Cooking",          variants:[{size:"200g",price:50,costPrice:43},{size:"500g",price:110,costPrice:96},{size:"1kg",price:200,costPrice:175}] },
  // ── IMG 20: Talati Kesari Doodh Masala ───────────────────────────────────
  { baseName:"Talati Kesari Doodh Masala",           localName:"तलाटी केसरी दूध मसाला",             brand:"Talati Foods",     category:"Spices & Masalas",          variants:[{size:"20g Sachet",price:10,costPrice:8},{size:"Box of 12",price:110,costPrice:95}] },
  // ── IMG 21: Shubh Labh Desiccated Coconut Powder ─────────────────────────
  { baseName:"Shubh Labh Desiccated Coconut Powder", localName:"शुभ लाभ डेसिकेटेड नारियल पाउडर",  brand:"Shubh Labh",       category:"Baking & Cooking",          variants:[{size:"200g",price:50,costPrice:43},{size:"500g",price:110,costPrice:96},{size:"1kg",price:200,costPrice:175}] },
  // ── IMG 23: Saumya Beti Ke Masale (loose spice sachets) ──────────────────
  { baseName:"Saumya Beti Jeera Sachet",             localName:"सौम्या बेटी जीरा सैशे",             brand:"Saumya Beti",      category:"Spices & Masalas",          variants:[{size:"Rs.10 Sachet",price:10,costPrice:8}] },
  { baseName:"Saumya Beti Kali Mirch Sachet",        localName:"सौम्या बेटी काली मिर्च सैशे",       brand:"Saumya Beti",      category:"Spices & Masalas",          variants:[{size:"Rs.10 Sachet",price:10,costPrice:8}] },
  { baseName:"Saumya Beti Laung Sachet",             localName:"सौम्या बेटी लौंग सैशे",             brand:"Saumya Beti",      category:"Spices & Masalas",          variants:[{size:"Rs.10 Sachet",price:10,costPrice:8}] },
  { baseName:"Saumya Beti Rai Sachet",               localName:"सौम्या बेटी राई सैशे",              brand:"Saumya Beti",      category:"Spices & Masalas",          variants:[{size:"Rs.10 Sachet",price:10,costPrice:8}] },
  { baseName:"Saumya Beti Panchmeva Sachet",         localName:"सौम्या बेटी पंचमेवा सैशे",          brand:"Saumya Beti",      category:"Spices & Masalas",          variants:[{size:"Rs.10 Sachet",price:10,costPrice:8}] },
  { baseName:"Saumya Beti Saunf Sachet",             localName:"सौम्या बेटी सौंफ सैशे",             brand:"Saumya Beti",      category:"Spices & Masalas",          variants:[{size:"Rs.10 Sachet",price:10,costPrice:8}] },
  { baseName:"Saumya Beti Ajwain Sachet",            localName:"सौम्या बेटी अजवाइन सैशे",           brand:"Saumya Beti",      category:"Spices & Masalas",          variants:[{size:"Rs.10 Sachet",price:10,costPrice:8}] },
];

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  New Shop — Batch 2 (Noodles/Cleaning/Spices/Coconut)");
  console.log("=".repeat(60) + "\n");

  const shopsSnap = await getDocs(collection(db, "shops"));
  let targetShop = null;
  for (const d of shopsSnap.docs) {
    if ((d.data().name || "").toLowerCase() === "new shop") { targetShop = { id: d.id, ...d.data() }; break; }
  }
  if (!targetShop) { console.error("New Shop not found."); process.exit(1); }
  console.log("Shop: " + targetShop.name + " (" + targetShop.id + ")");

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
  console.log("-".repeat(60) + "\n");
  process.exit(0);
}
main().catch(e => { console.error("Fatal:", e); process.exit(1); });
