import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim(); if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("="); if (eq === -1) continue;
    const k = t.slice(0, eq).trim(); const v = t.slice(eq+1).trim().replace(/^["']|["']$/g,"");
    if (!process.env[k]) process.env[k] = v;
  }
}
const app = getApps().length === 0 ? initializeApp({ apiKey:"AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk", authDomain:"retlex-ai.firebaseapp.com", projectId:"retlex-ai" }) : getApps()[0];
const db = getFirestore(app);
const SHOP_ID = "NjGBnhsc25w4jb2q6Ol4";
const CAT = "Laundry";

// Verified OFF images for laundry products
const IMG = {
  powder: "https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg",
  liquid: "https://images.openfoodfacts.org/images/products/890/154/200/1246/front_en.3.400.jpg",
  bar:    "https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg",
  fabric: "https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg",
};

const PRODUCTS = [
  // ── WASHING POWDER ────────────────────────────────────────────────────────
  { name:"Surf Excel 500g", localName:"सर्फ एक्सेल 500 ग्राम", price:95, costPrice:75, baseUnit:"pkt", packetWeight:500, packetUnit:"g", imageUrl:IMG.powder },
  { name:"Surf Excel 1kg", localName:"सर्फ एक्सेल 1 किलो", price:185, costPrice:146, baseUnit:"pkt", packetWeight:1000, packetUnit:"g", imageUrl:IMG.powder },
  { name:"Surf Excel 2kg", localName:"सर्फ एक्सेल 2 किलो", price:360, costPrice:285, baseUnit:"pkt", packetWeight:2000, packetUnit:"g", imageUrl:IMG.powder },
  { name:"Ariel 500g", localName:"एरियल 500 ग्राम", price:105, costPrice:83, baseUnit:"pkt", packetWeight:500, packetUnit:"g", imageUrl:IMG.powder },
  { name:"Ariel 1kg", localName:"एरियल 1 किलो", price:200, costPrice:158, baseUnit:"pkt", packetWeight:1000, packetUnit:"g", imageUrl:IMG.powder },
  { name:"Tide 500g", localName:"टाइड 500 ग्राम", price:85, costPrice:67, baseUnit:"pkt", packetWeight:500, packetUnit:"g", imageUrl:IMG.powder },
  { name:"Tide 1kg", localName:"टाइड 1 किलो", price:165, costPrice:130, baseUnit:"pkt", packetWeight:1000, packetUnit:"g", imageUrl:IMG.powder },
  { name:"Rin Powder 500g", localName:"रिन पाउडर 500 ग्राम", price:65, costPrice:50, baseUnit:"pkt", packetWeight:500, packetUnit:"g", imageUrl:IMG.powder },
  { name:"Rin Powder 1kg", localName:"रिन पाउडर 1 किलो", price:125, costPrice:98, baseUnit:"pkt", packetWeight:1000, packetUnit:"g", imageUrl:IMG.powder },
  { name:"Wheel Powder 500g", localName:"व्हील पाउडर 500 ग्राम", price:55, costPrice:42, baseUnit:"pkt", packetWeight:500, packetUnit:"g", imageUrl:IMG.powder },
  { name:"Wheel Powder 1kg", localName:"व्हील पाउडर 1 किलो", price:105, costPrice:82, baseUnit:"pkt", packetWeight:1000, packetUnit:"g", imageUrl:IMG.powder },
  { name:"Nirma Powder 500g", localName:"निरमा पाउडर 500 ग्राम", price:52, costPrice:40, baseUnit:"pkt", packetWeight:500, packetUnit:"g", imageUrl:IMG.powder },
  { name:"Nirma Powder 1kg", localName:"निरमा पाउडर 1 किलो", price:98, costPrice:76, baseUnit:"pkt", packetWeight:1000, packetUnit:"g", imageUrl:IMG.powder },
  { name:"Patanjali Washing Powder 1kg", localName:"पतंजलि वाशिंग पाउडर 1 किलो", price:85, costPrice:66, baseUnit:"pkt", packetWeight:1000, packetUnit:"g", imageUrl:IMG.powder },

  // ── LIQUID DETERGENT ──────────────────────────────────────────────────────
  { name:"Surf Excel Liquid 500ml", localName:"सर्फ एक्सेल लिक्विड 500 मिली", price:145, costPrice:115, baseUnit:"pkt", packetWeight:500, packetUnit:"ml", imageUrl:IMG.liquid },
  { name:"Surf Excel Liquid 1L", localName:"सर्फ एक्सेल लिक्विड 1 लीटर", price:275, costPrice:218, baseUnit:"pkt", packetWeight:1000, packetUnit:"ml", imageUrl:IMG.liquid },
  { name:"Ariel Liquid 500ml", localName:"एरियल लिक्विड 500 मिली", price:155, costPrice:122, baseUnit:"pkt", packetWeight:500, packetUnit:"ml", imageUrl:IMG.liquid },
  { name:"Comfort Fabric Conditioner 200ml", localName:"कम्फर्ट फैब्रिक कंडीशनर 200 मिली", price:85, costPrice:67, baseUnit:"pkt", packetWeight:200, packetUnit:"ml", imageUrl:IMG.fabric },
  { name:"Comfort Fabric Conditioner 500ml", localName:"कम्फर्ट फैब्रिक कंडीशनर 500 मिली", price:185, costPrice:146, baseUnit:"pkt", packetWeight:500, packetUnit:"ml", imageUrl:IMG.fabric },

  // ── WASHING BAR / CAKE ────────────────────────────────────────────────────
  { name:"Rin Bar 250g", localName:"रिन बार 250 ग्राम", price:28, costPrice:21, baseUnit:"pkt", packetWeight:250, packetUnit:"g", imageUrl:IMG.bar },
  { name:"Rin Bar 500g", localName:"रिन बार 500 ग्राम", price:52, costPrice:40, baseUnit:"pkt", packetWeight:500, packetUnit:"g", imageUrl:IMG.bar },
  { name:"Ghadi Detergent Bar 200g", localName:"घड़ी डिटर्जेंट बार 200 ग्राम", price:22, costPrice:16, baseUnit:"pkt", packetWeight:200, packetUnit:"g", imageUrl:IMG.bar },
  { name:"Nirma Bar 200g", localName:"निरमा बार 200 ग्राम", price:18, costPrice:13, baseUnit:"pkt", packetWeight:200, packetUnit:"g", imageUrl:IMG.bar },
  { name:"Surf Excel Bar 200g", localName:"सर्फ एक्सेल बार 200 ग्राम", price:35, costPrice:27, baseUnit:"pkt", packetWeight:200, packetUnit:"g", imageUrl:IMG.bar },

  // ── FABRIC CARE ───────────────────────────────────────────────────────────
  { name:"Robin Blue 200ml", localName:"रॉबिन ब्लू 200 मिली", price:45, costPrice:34, baseUnit:"pkt", packetWeight:200, packetUnit:"ml", imageUrl:IMG.fabric },
  { name:"Ujala Fabric Whitener 200ml", localName:"उजाला फैब्रिक व्हाइटनर 200 मिली", price:55, costPrice:42, baseUnit:"pkt", packetWeight:200, packetUnit:"ml", imageUrl:IMG.fabric },
  { name:"Ezee Liquid Detergent 500ml", localName:"ईज़ी लिक्विड डिटर्जेंट 500 मिली", price:95, costPrice:75, baseUnit:"pkt", packetWeight:500, packetUnit:"ml", imageUrl:IMG.liquid },
];

async function main() {
  console.log("Seeding Laundry products...");
  const existing = await getDocs(query(collection(db,"products"),where("shopId","==",SHOP_ID)));
  const existingNames = new Set(existing.docs.map(d=>d.data().name?.toLowerCase().trim()));
  let added=0, skipped=0;
  for (const item of PRODUCTS) {
    if (existingNames.has(item.name.toLowerCase().trim())) { console.log("Skip:", item.name); skipped++; continue; }
    await addDoc(collection(db,"products"), {
      name: item.name, localName: item.localName, price: item.price, costPrice: item.costPrice,
      baseUnit: item.baseUnit, baseQuantity: 1,
      packetWeight: item.packetWeight, packetUnit: item.packetUnit,
      imageUrl: item.imageUrl, category: CAT, barcode: null, shopId: SHOP_ID
    });
    console.log("Added:", item.name);
    added++;
  }
  console.log("Added:", added, "| Skipped:", skipped);
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
