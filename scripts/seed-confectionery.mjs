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
const CAT = "Confectionery";

const IMG = {
  choc:   "https://images.openfoodfacts.org/images/products/762/220/233/4009/front_en.3.400.jpg",
  candy:  "https://images.openfoodfacts.org/images/products/890/434/070/0137/front_en.3.400.jpg",
  gum:    "https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg",
  toffee: "https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg",
  wafer:  "https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg",
};

const PRODUCTS = [
  // ── CADBURY / MONDELEZ ────────────────────────────────────────────────────
  { name:"Dairy Milk 13g", localName:"डेयरी मिल्क 13 ग्राम", price:10, img:IMG.choc },
  { name:"Dairy Milk 36g", localName:"डेयरी मिल्क 36 ग्राम", price:20, img:IMG.choc },
  { name:"Dairy Milk Silk 60g", localName:"डेयरी मिल्क सिल्क 60 ग्राम", price:55, img:IMG.choc },
  { name:"Dairy Milk Silk 145g", localName:"डेयरी मिल्क सिल्क 145 ग्राम", price:120, img:IMG.choc },
  { name:"5 Star 22g", localName:"5 स्टार 22 ग्राम", price:10, img:IMG.choc },
  { name:"5 Star 40g", localName:"5 स्टार 40 ग्राम", price:20, img:IMG.choc },
  { name:"Munch 13g", localName:"मंच 13 ग्राम", price:10, img:IMG.wafer },
  { name:"Munch 35g", localName:"मंच 35 ग्राम", price:20, img:IMG.wafer },
  { name:"Gems 22g", localName:"जेम्स 22 ग्राम", price:10, img:IMG.candy },
  { name:"Bournvita Biscuit Roll", localName:"बॉर्नविटा बिस्किट रोल", price:10, img:IMG.choc },

  // ── NESTLE ────────────────────────────────────────────────────────────────
  { name:"KitKat 13g", localName:"किटकैट 13 ग्राम", price:10, img:IMG.wafer },
  { name:"KitKat 37g", localName:"किटकैट 37 ग्राम", price:30, img:IMG.wafer },
  { name:"Munch Nuts", localName:"मंच नट्स", price:10, img:IMG.wafer },
  { name:"Milkybar 12g", localName:"मिल्कीबार 12 ग्राम", price:10, img:IMG.choc },
  { name:"Milkybar 30g", localName:"मिल्कीबार 30 ग्राम", price:20, img:IMG.choc },

  // ── CANDIES & TOFFEES ─────────────────────────────────────────────────────
  { name:"Pulse Candy Kachcha Aam", localName:"पल्स कैंडी कच्चा आम", price:1, img:IMG.candy },
  { name:"Alpenliebe Candy", localName:"अल्पेनलीबे कैंडी", price:1, img:IMG.candy },
  { name:"Eclairs Toffee", localName:"एक्लेयर्स टॉफी", price:1, img:IMG.toffee },
  { name:"Mango Bite Candy", localName:"मैंगो बाइट कैंडी", price:1, img:IMG.candy },
  { name:"Hajmola Candy", localName:"हाजमोला कैंडी", price:1, img:IMG.candy },
  { name:"Kopiko Coffee Candy", localName:"कोपिको कॉफी कैंडी", price:1, img:IMG.candy },
  { name:"Melody Toffee", localName:"मेलोडी टॉफी", price:1, img:IMG.toffee },
  { name:"Poppins Candy Roll", localName:"पॉपिन्स कैंडी रोल", price:5, img:IMG.candy },
  { name:"Toffee Packet 100g", localName:"टॉफी पैकेट 100 ग्राम", price:35, img:IMG.toffee },

  // ── CHEWING GUM ───────────────────────────────────────────────────────────
  { name:"Center Fresh Gum", localName:"सेंटर फ्रेश गम", price:2, img:IMG.gum },
  { name:"Center Fruit Gum", localName:"सेंटर फ्रूट गम", price:2, img:IMG.gum },
  { name:"Boomer Gum", localName:"बूमर गम", price:1, img:IMG.gum },
  { name:"Big Babol Gum", localName:"बिग बाबोल गम", price:5, img:IMG.gum },
  { name:"Orbit Gum", localName:"ऑर्बिट गम", price:15, img:IMG.gum },

  // ── WAFER & CREAM ROLLS ───────────────────────────────────────────────────
  { name:"Perk 13g", localName:"पर्क 13 ग्राम", price:10, img:IMG.wafer },
  { name:"Perk 37g", localName:"पर्क 37 ग्राम", price:20, img:IMG.wafer },
  { name:"Kit Kat Chunky", localName:"किटकैट चंकी", price:30, img:IMG.wafer },
  { name:"Wafer Roll Cream", localName:"वेफर रोल क्रीम", price:10, img:IMG.wafer },
];

async function main() {
  console.log("Seeding Confectionery...");
  const existing = await getDocs(query(collection(db,"products"),where("shopId","==",SHOP_ID)));
  const existingNames = new Set(existing.docs.map(d=>d.data().name?.toLowerCase().trim()));
  let added=0, skipped=0;
  for (const item of PRODUCTS) {
    if (existingNames.has(item.name.toLowerCase().trim())) { skipped++; continue; }
    await addDoc(collection(db,"products"), {
      name:item.name, localName:item.localName, price:item.price,
      costPrice:Math.round(item.price*0.78),
      baseUnit:"pc", baseQuantity:1, packetWeight:null, packetUnit:null,
      imageUrl:item.img, category:CAT, barcode:null, shopId:SHOP_ID
    });
    console.log("Added:", item.name);
    added++;
  }
  console.log("Added:", added, "| Skipped:", skipped);
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
