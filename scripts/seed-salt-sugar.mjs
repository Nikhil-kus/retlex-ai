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
const CAT = "Salt & Sugar";

const IMG = {
  salt:   "https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg",
  sugar:  "https://images.openfoodfacts.org/images/products/890/172/512/1228/front_en.3.400.jpg",
  gud:    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Jaggery.jpg/320px-Jaggery.jpg",
  mishri: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Rock_candy_sticks.jpg/320px-Rock_candy_sticks.jpg",
  bura:   "https://images.openfoodfacts.org/images/products/890/172/512/1228/front_en.3.400.jpg",
};

const PRODUCTS = [
  // ── SALT ──────────────────────────────────────────────────────────────────
  { name:"Namak Khula", localName:"नमक खुला", price:10, costPrice:7, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.salt },
  { name:"Tata Salt 1kg", localName:"टाटा नमक 1 किलो", price:22, costPrice:17, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.salt },
  { name:"Tata Salt 2kg", localName:"टाटा नमक 2 किलो", price:42, costPrice:33, baseUnit:"pkt", baseQuantity:1, packetWeight:2000, packetUnit:"g", imageUrl:IMG.salt },
  { name:"Tata Rock Salt 1kg", localName:"टाटा सेंधा नमक 1 किलो", price:28, costPrice:21, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.salt },
  { name:"Catch Salt 1kg", localName:"कैच नमक 1 किलो", price:20, costPrice:15, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.salt },
  { name:"Sendha Namak 1kg", localName:"सेंधा नमक 1 किलो", price:30, costPrice:22, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.salt },
  { name:"Sendha Namak Khula", localName:"सेंधा नमक खुला", price:12, costPrice:8, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.salt },
  { name:"Kala Namak 100g", localName:"काला नमक 100 ग्राम", price:18, costPrice:12, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.salt },
  { name:"Kala Namak Khula", localName:"काला नमक खुला", price:15, costPrice:10, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.salt },

  // ── SUGAR ─────────────────────────────────────────────────────────────────
  { name:"Cheeni Khula", localName:"चीनी खुला", price:42, costPrice:33, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.sugar },
  { name:"Sugar 1kg", localName:"चीनी 1 किलो", price:45, costPrice:35, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.sugar },
  { name:"Sugar 2kg", localName:"चीनी 2 किलो", price:88, costPrice:69, baseUnit:"pkt", baseQuantity:1, packetWeight:2000, packetUnit:"g", imageUrl:IMG.sugar },
  { name:"Sugar 5kg", localName:"चीनी 5 किलो", price:215, costPrice:170, baseUnit:"pkt", baseQuantary:1, packetWeight:5000, packetUnit:"g", imageUrl:IMG.sugar },
  { name:"Bura Sugar 500g", localName:"बूरा शक्कर 500 ग्राम", price:38, costPrice:28, baseUnit:"pkt", baseQuantity:1, packetWeight:500, packetUnit:"g", imageUrl:IMG.bura },
  { name:"Bura Sugar 1kg", localName:"बूरा शक्कर 1 किलो", price:72, costPrice:55, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.bura },
  { name:"Icing Sugar 500g", localName:"आइसिंग शुगर 500 ग्राम", price:55, costPrice:42, baseUnit:"pkt", baseQuantity:1, packetWeight:500, packetUnit:"g", imageUrl:IMG.sugar },

  // ── GUD / JAGGERY ─────────────────────────────────────────────────────────
  { name:"Gud Khula", localName:"गुड़ खुला", price:45, costPrice:34, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.gud },
  { name:"Gud 500g", localName:"गुड़ 500 ग्राम", price:55, costPrice:42, baseUnit:"pkt", baseQuantity:1, packetWeight:500, packetUnit:"g", imageUrl:IMG.gud },
  { name:"Gud 1kg", localName:"गुड़ 1 किलो", price:105, costPrice:82, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.gud },
  { name:"Patanjali Gud 500g", localName:"पतंजलि गुड़ 500 ग्राम", price:52, costPrice:40, baseUnit:"pkt", baseQuantity:1, packetWeight:500, packetUnit:"g", imageUrl:IMG.gud },

  // ── MISHRI ────────────────────────────────────────────────────────────────
  { name:"Mishri Khula", localName:"मिश्री खुला", price:15, costPrice:10, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.mishri },
  { name:"Mishri 250g", localName:"मिश्री 250 ग्राम", price:35, costPrice:25, baseUnit:"pkt", baseQuantity:1, packetWeight:250, packetUnit:"g", imageUrl:IMG.mishri },
  { name:"Mishri 500g", localName:"मिश्री 500 ग्राम", price:65, costPrice:48, baseUnit:"pkt", baseQuantity:1, packetWeight:500, packetUnit:"g", imageUrl:IMG.mishri },
];

async function main() {
  console.log("Seeding Salt & Sugar...");
  const existing = await getDocs(query(collection(db,"products"),where("shopId","==",SHOP_ID)));
  const existingNames = new Set(existing.docs.map(d=>d.data().name?.toLowerCase().trim()));
  let added=0, skipped=0;
  for (const item of PRODUCTS) {
    if (existingNames.has(item.name.toLowerCase().trim())) { console.log("Skip:", item.name); skipped++; continue; }
    const { packetWeight, packetUnit, baseUnit, baseQuantity, ...rest } = item;
    await addDoc(collection(db,"products"), {
      ...rest,
      baseUnit: baseUnit,
      baseQuantity: baseUnit === "g" || baseUnit === "ml" ? baseQuantity : 1,
      packetWeight: packetWeight || null,
      packetUnit: packetUnit || null,
      category: CAT, barcode: null, shopId: SHOP_ID
    });
    console.log("Added:", item.name);
    added++;
  }
  console.log("Added:", added, "| Skipped:", skipped);
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
