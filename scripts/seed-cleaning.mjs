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
const CAT = "Household Cleaning";

const IMG = {
  toilet:  "https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg",
  floor:   "https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg",
  dish:    "https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg",
  glass:   "https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg",
  surface: "https://images.openfoodfacts.org/images/products/890/154/200/1246/front_en.3.400.jpg",
  scrub:   "https://images.openfoodfacts.org/images/products/890/120/703/1717/front_en.3.400.jpg",
};

const PRODUCTS = [
  // ── TOILET CLEANER ────────────────────────────────────────────────────────
  { name:"Harpic 500ml", localName:"हार्पिक 500 मिली", price:115, costPrice:90 },
  { name:"Harpic 1L", localName:"हार्पिक 1 लीटर", price:195, costPrice:154 },
  { name:"Domex Toilet Cleaner 500ml", localName:"डोमेक्स टॉयलेट क्लीनर 500 मिली", price:95, costPrice:74 },
  { name:"Lizol Toilet Cleaner 500ml", localName:"लाइज़ोल टॉयलेट क्लीनर 500 मिली", price:105, costPrice:82 },

  // ── FLOOR CLEANER ─────────────────────────────────────────────────────────
  { name:"Phenyl 500ml", localName:"फिनाइल 500 मिली", price:55, costPrice:42 },
  { name:"Phenyl 1L", localName:"फिनाइल 1 लीटर", price:95, costPrice:74 },
  { name:"Lizol Floor Cleaner 500ml", localName:"लाइज़ोल फ्लोर क्लीनर 500 मिली", price:115, costPrice:90 },
  { name:"Dettol Floor Cleaner 500ml", localName:"डेटॉल फ्लोर क्लीनर 500 मिली", price:105, costPrice:82 },
  { name:"Colin Floor Cleaner 500ml", localName:"कोलिन फ्लोर क्लीनर 500 मिली", price:95, costPrice:74 },

  // ── DISH WASH ─────────────────────────────────────────────────────────────
  { name:"Vim Liquid 250ml", localName:"विम लिक्विड 250 मिली", price:65, costPrice:50 },
  { name:"Vim Liquid 500ml", localName:"विम लिक्विड 500 मिली", price:115, costPrice:90 },
  { name:"Vim Bar 200g", localName:"विम बार 200 ग्राम", price:22, costPrice:16 },
  { name:"Pril Dish Wash Liquid 250ml", localName:"प्रिल डिश वॉश 250 मिली", price:65, costPrice:50 },
  { name:"Exo Dish Wash Bar 200g", localName:"एक्सो डिश वॉश बार 200 ग्राम", price:20, costPrice:14 },
  { name:"Scotch Brite Scrub Pad", localName:"स्कॉच ब्राइट स्क्रब पैड", price:35, costPrice:26 },

  // ── GLASS & SURFACE CLEANER ───────────────────────────────────────────────
  { name:"Colin Glass Cleaner 250ml", localName:"कोलिन ग्लास क्लीनर 250 मिली", price:85, costPrice:66 },
  { name:"Colin Glass Cleaner 500ml", localName:"कोलिन ग्लास क्लीनर 500 मिली", price:145, costPrice:114 },
  { name:"Dettol Surface Cleaner 500ml", localName:"डेटॉल सर्फेस क्लीनर 500 मिली", price:115, costPrice:90 },

  // ── BATHROOM CLEANER ──────────────────────────────────────────────────────
  { name:"Rin Toilet Cleaner 500ml", localName:"रिन टॉयलेट क्लीनर 500 मिली", price:75, costPrice:58 },
  { name:"Sanifresh Toilet Cleaner 500ml", localName:"सैनीफ्रेश टॉयलेट क्लीनर 500 मिली", price:85, costPrice:66 },

  // ── BROOM & MOP ───────────────────────────────────────────────────────────
  { name:"Broom (Jhadu)", localName:"झाड़ू", price:45, costPrice:34 },
  { name:"Mop Refill", localName:"मॉप रिफिल", price:85, costPrice:66 },
  { name:"Dustpan", localName:"कूड़ेदान", price:35, costPrice:26 },
];

async function main() {
  console.log("Seeding Household Cleaning...");
  const existing = await getDocs(query(collection(db,"products"),where("shopId","==",SHOP_ID)));
  const existingNames = new Set(existing.docs.map(d=>d.data().name?.toLowerCase().trim()));
  let added=0, skipped=0;
  for (const item of PRODUCTS) {
    if (existingNames.has(item.name.toLowerCase().trim())) { skipped++; continue; }
    // Pick image based on product type
    let img = IMG.surface;
    const n = item.name.toLowerCase();
    if (n.includes("harpic")||n.includes("toilet")||n.includes("domex")||n.includes("lizol toilet")||n.includes("sanifresh")||n.includes("rin toilet")) img = IMG.toilet;
    else if (n.includes("phenyl")||n.includes("floor")||n.includes("dettol floor")) img = IMG.floor;
    else if (n.includes("vim")||n.includes("pril")||n.includes("exo")||n.includes("dish")) img = IMG.dish;
    else if (n.includes("colin")||n.includes("glass")) img = IMG.glass;
    else if (n.includes("scrub")||n.includes("broom")||n.includes("mop")||n.includes("dustpan")) img = IMG.scrub;
    await addDoc(collection(db,"products"), {
      name:item.name, localName:item.localName, price:item.price, costPrice:item.costPrice,
      baseUnit:"pc", baseQuantity:1, packetWeight:null, packetUnit:null,
      imageUrl:img, category:CAT, barcode:null, shopId:SHOP_ID
    });
    console.log("Added:", item.name);
    added++;
  }
  console.log("Added:", added, "| Skipped:", skipped);
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
