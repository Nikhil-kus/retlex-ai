import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, query, where } from "firebase/firestore";
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
const CAT = "Household Essentials";

const IMG = {
  mosquito: "https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg",
  tissue:   "https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg",
  bag:      "https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg",
  candle:   "https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg",
  battery:  "https://images.openfoodfacts.org/images/products/890/154/200/1246/front_en.3.400.jpg",
  foil:     "https://images.openfoodfacts.org/images/products/890/120/703/1717/front_en.3.400.jpg",
  rope:     "https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg",
  napkin:   "https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg",
  sanitizer:"https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg",
  bulb:     "https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg",
};

// One product per item — no size variants needed
const PRODUCTS = [
  // ── MOSQUITO REPELLENT ────────────────────────────────────────────────────
  { name:"Good Night Liquid Refill", localName:"गुड नाइट लिक्विड रिफिल", price:65, costPrice:50, baseUnit:"pc", imageUrl:IMG.mosquito },
  { name:"Good Night Machine", localName:"गुड नाइट मशीन", price:85, costPrice:66, baseUnit:"pc", imageUrl:IMG.mosquito },
  { name:"All Out Liquid Refill", localName:"ऑल आउट लिक्विड रिफिल", price:65, costPrice:50, baseUnit:"pc", imageUrl:IMG.mosquito },
  { name:"All Out Machine", localName:"ऑल आउट मशीन", price:85, costPrice:66, baseUnit:"pc", imageUrl:IMG.mosquito },
  { name:"Mortein Spray 425ml", localName:"मोर्टीन स्प्रे 425 मिली", price:185, costPrice:145, baseUnit:"pc", imageUrl:IMG.mosquito },
  { name:"Hit Spray 200ml", localName:"हिट स्प्रे 200 मिली", price:95, costPrice:74, baseUnit:"pc", imageUrl:IMG.mosquito },
  { name:"Odomos Mosquito Repellent Cream 50g", localName:"ओडोमोस क्रीम 50 ग्राम", price:75, costPrice:58, baseUnit:"pc", imageUrl:IMG.mosquito },
  { name:"Mosquito Coil (10 pcs)", localName:"मच्छर कॉइल 10 पीस", price:35, costPrice:26, baseUnit:"pc", imageUrl:IMG.mosquito },

  // ── MATCHBOX & LIGHTER ────────────────────────────────────────────────────
  { name:"Matchbox", localName:"माचिस", price:2, costPrice:1, baseUnit:"pc", imageUrl:IMG.candle },
  { name:"Lighter", localName:"लाइटर", price:15, costPrice:10, baseUnit:"pc", imageUrl:IMG.candle },
  { name:"Gas Lighter", localName:"गैस लाइटर", price:45, costPrice:34, baseUnit:"pc", imageUrl:IMG.candle },

  // ── CANDLES ───────────────────────────────────────────────────────────────
  { name:"Candle Small (Pack of 6)", localName:"मोमबत्ती छोटी 6 पीस", price:25, costPrice:18, baseUnit:"pc", imageUrl:IMG.candle },
  { name:"Candle Big", localName:"मोमबत्ती बड़ी", price:15, costPrice:10, baseUnit:"pc", imageUrl:IMG.candle },

  // ── TISSUE & NAPKIN ───────────────────────────────────────────────────────
  { name:"Tissue Paper Box 100 pulls", localName:"टिशू पेपर बॉक्स 100 पुल्स", price:85, costPrice:66, baseUnit:"pc", imageUrl:IMG.tissue },
  { name:"Tissue Roll", localName:"टिशू रोल", price:35, costPrice:26, baseUnit:"pc", imageUrl:IMG.tissue },
  { name:"Napkin Paper Pack", localName:"नैपकिन पेपर पैक", price:45, costPrice:34, baseUnit:"pc", imageUrl:IMG.napkin },
  { name:"Toilet Paper Roll", localName:"टॉयलेट पेपर रोल", price:55, costPrice:42, baseUnit:"pc", imageUrl:IMG.tissue },

  // ── CARRY BAGS ────────────────────────────────────────────────────────────
  { name:"Carry Bag Small (50 pcs)", localName:"कैरी बैग छोटा 50 पीस", price:25, costPrice:18, baseUnit:"pc", imageUrl:IMG.bag },
  { name:"Carry Bag Medium (50 pcs)", localName:"कैरी बैग मध्यम 50 पीस", price:35, costPrice:26, baseUnit:"pc", imageUrl:IMG.bag },
  { name:"Carry Bag Large (25 pcs)", localName:"कैरी बैग बड़ा 25 पीस", price:30, costPrice:22, baseUnit:"pc", imageUrl:IMG.bag },

  // ── ALUMINIUM FOIL & WRAP ─────────────────────────────────────────────────
  { name:"Aluminium Foil Roll", localName:"एल्युमिनियम फॉइल रोल", price:65, costPrice:50, baseUnit:"pc", imageUrl:IMG.foil },
  { name:"Cling Wrap Roll", localName:"क्लिंग रैप रोल", price:55, costPrice:42, baseUnit:"pc", imageUrl:IMG.foil },

  // ── BATTERIES ─────────────────────────────────────────────────────────────
  { name:"Duracell AA Battery (2 pcs)", localName:"ड्यूरासेल AA बैटरी 2 पीस", price:85, costPrice:66, baseUnit:"pc", imageUrl:IMG.battery },
  { name:"Eveready AA Battery (2 pcs)", localName:"एवरेडी AA बैटरी 2 पीस", price:45, costPrice:34, baseUnit:"pc", imageUrl:IMG.battery },
  { name:"Eveready AAA Battery (2 pcs)", localName:"एवरेडी AAA बैटरी 2 पीस", price:45, costPrice:34, baseUnit:"pc", imageUrl:IMG.battery },

  // ── HAND SANITIZER ────────────────────────────────────────────────────────
  { name:"Dettol Hand Sanitizer 50ml", localName:"डेटॉल हैंड सैनिटाइजर 50 मिली", price:55, costPrice:42, baseUnit:"pc", imageUrl:IMG.sanitizer },
  { name:"Dettol Hand Sanitizer 200ml", localName:"डेटॉल हैंड सैनिटाइजर 200 मिली", price:145, costPrice:114, baseUnit:"pc", imageUrl:IMG.sanitizer },
  { name:"Lifebuoy Hand Sanitizer 50ml", localName:"लाइफबॉय हैंड सैनिटाइजर 50 मिली", price:50, costPrice:38, baseUnit:"pc", imageUrl:IMG.sanitizer },

  // ── ROPE & CLIPS ──────────────────────────────────────────────────────────
  { name:"Nylon Rope 10m", localName:"नायलॉन रस्सी 10 मीटर", price:35, costPrice:26, baseUnit:"pc", imageUrl:IMG.rope },
  { name:"Cloth Clips (12 pcs)", localName:"कपड़े की क्लिप 12 पीस", price:25, costPrice:18, baseUnit:"pc", imageUrl:IMG.rope },

  // ── BULB / ELECTRICAL ─────────────────────────────────────────────────────
  { name:"LED Bulb 9W", localName:"एलईडी बल्ब 9 वाट", price:65, costPrice:50, baseUnit:"pc", imageUrl:IMG.bulb },
  { name:"LED Bulb 12W", localName:"एलईडी बल्ब 12 वाट", price:85, costPrice:66, baseUnit:"pc", imageUrl:IMG.bulb },
  { name:"CFL Bulb", localName:"सीएफएल बल्ब", price:55, costPrice:42, baseUnit:"pc", imageUrl:IMG.bulb },
];

async function main() {
  console.log("Seeding Household Essentials...");

  // Fix wrong items in this category
  const snap = await getDocs(query(collection(db,"products"),where("shopId","==",SHOP_ID),where("category","==",CAT)));
  for (const d of snap.docs) {
    const name = d.data().name;
    if (name.includes("Biotique") || name.includes("Supadi")) {
      await updateDoc(doc(db,"products",d.id), { category: name.includes("Biotique") ? "Moisturisers" : "Tobacco & Pan" });
      console.log("Moved:", name);
    }
  }

  // Add new products
  const existing = await getDocs(query(collection(db,"products"),where("shopId","==",SHOP_ID)));
  const existingNames = new Set(existing.docs.map(d=>d.data().name?.toLowerCase().trim()));
  let added=0, skipped=0;
  for (const item of PRODUCTS) {
    if (existingNames.has(item.name.toLowerCase().trim())) { skipped++; continue; }
    await addDoc(collection(db,"products"), {
      name:item.name, localName:item.localName, price:item.price, costPrice:item.costPrice,
      baseUnit:item.baseUnit, baseQuantity:1, packetWeight:null, packetUnit:null,
      imageUrl:item.imageUrl, category:CAT, barcode:null, shopId:SHOP_ID
    });
    console.log("Added:", item.name);
    added++;
  }
  console.log("Added:", added, "| Skipped:", skipped);
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
