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
const CAT = "Grains & Cereals";

// Verified Open Food Facts images for grains
const IMG = {
  aata:     "https://images.openfoodfacts.org/images/products/890/172/512/1228/front_en.3.400.jpg",
  rice:     "https://images.openfoodfacts.org/images/products/890/501/234/5038/front_en.3.400.jpg",
  maida:    "https://images.openfoodfacts.org/images/products/890/800/905/9185/front_en.3.400.jpg",
  besan:    "https://images.openfoodfacts.org/images/products/890/178/614/0503/front_en.3.400.jpg",
  suji:     "https://images.openfoodfacts.org/images/products/890/600/102/3043/front_en.3.400.jpg",
  poha:     "https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg",
  sabudana: "https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg",
  daliya:   "https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg",
  corn:     "https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg",
  oats:     "https://images.openfoodfacts.org/images/products/890/154/200/1246/front_en.3.400.jpg",
  millet:   "https://images.openfoodfacts.org/images/products/890/120/703/1717/front_en.3.400.jpg",
};

const PRODUCTS = [
  // ── AATA (WHEAT FLOUR) ────────────────────────────────────────────────────
  { name:"Aata Khula", localName:"आटा खुला", price:28, costPrice:22, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.aata },
  { name:"Aata 1kg", localName:"आटा 1 किलो", price:45, costPrice:35, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.aata },
  { name:"Aata 2kg", localName:"आटा 2 किलो", price:85, costPrice:66, baseUnit:"pkt", baseQuantity:1, packetWeight:2000, packetUnit:"g", imageUrl:IMG.aata },
  { name:"Aata 5kg", localName:"आटा 5 किलो", price:200, costPrice:158, baseUnit:"pkt", baseQuantity:1, packetWeight:5000, packetUnit:"g", imageUrl:IMG.aata },
  { name:"Aata 10kg", localName:"आटा 10 किलो", price:390, costPrice:308, baseUnit:"pkt", baseQuantity:1, packetWeight:10000, packetUnit:"g", imageUrl:IMG.aata },
  { name:"Ashirvaad Aata 5kg", localName:"आशीर्वाद आटा 5 किलो", price:225, costPrice:178, baseUnit:"pkt", baseQuantity:1, packetWeight:5000, packetUnit:"g", imageUrl:IMG.aata },
  { name:"Pillsbury Aata 5kg", localName:"पिल्सबरी आटा 5 किलो", price:220, costPrice:174, baseUnit:"pkt", baseQuantity:1, packetWeight:5000, packetUnit:"g", imageUrl:IMG.aata },

  // ── RICE ──────────────────────────────────────────────────────────────────
  { name:"Rice Khula", localName:"चावल खुला", price:35, costPrice:27, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.rice },
  { name:"Rice 1kg", localName:"चावल 1 किलो", price:55, costPrice:43, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.rice },
  { name:"Rice 5kg", localName:"चावल 5 किलो", price:265, costPrice:210, baseUnit:"pkt", baseQuantity:1, packetWeight:5000, packetUnit:"g", imageUrl:IMG.rice },
  { name:"Basmati Rice 1kg", localName:"बासमती चावल 1 किलो", price:95, costPrice:75, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.rice },
  { name:"Basmati Rice 5kg", localName:"बासमती चावल 5 किलो", price:460, costPrice:365, baseUnit:"pkt", baseQuantity:1, packetWeight:5000, packetUnit:"g", imageUrl:IMG.rice },
  { name:"India Gate Basmati 1kg", localName:"इंडिया गेट बासमती 1 किलो", price:120, costPrice:95, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.rice },
  { name:"India Gate Basmati 5kg", localName:"इंडिया गेट बासमती 5 किलो", price:580, costPrice:460, baseUnit:"pkt", baseQuantity:1, packetWeight:5000, packetUnit:"g", imageUrl:IMG.rice },

  // ── MAIDA ─────────────────────────────────────────────────────────────────
  { name:"Maida Khula", localName:"मैदा खुला", price:22, costPrice:16, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.maida },
  { name:"Maida 1kg", localName:"मैदा 1 किलो", price:38, costPrice:28, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.maida },
  { name:"Maida 2kg", localName:"मैदा 2 किलो", price:72, costPrice:54, baseUnit:"pkt", baseQuantity:1, packetWeight:2000, packetUnit:"g", imageUrl:IMG.maida },

  // ── BESAN ─────────────────────────────────────────────────────────────────
  { name:"Besan Khula", localName:"बेसन खुला", price:30, costPrice:22, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.besan },
  { name:"Besan 500g", localName:"बेसन 500 ग्राम", price:55, costPrice:42, baseUnit:"pkt", baseQuantity:1, packetWeight:500, packetUnit:"g", imageUrl:IMG.besan },
  { name:"Besan 1kg", localName:"बेसन 1 किलो", price:105, costPrice:82, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.besan },

  // ── SUJI / SEMOLINA ───────────────────────────────────────────────────────
  { name:"Suji Khula", localName:"सूजी खुला", price:25, costPrice:18, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.suji },
  { name:"Suji 500g", localName:"सूजी 500 ग्राम", price:45, costPrice:34, baseUnit:"pkt", baseQuantity:1, packetWeight:500, packetUnit:"g", imageUrl:IMG.suji },
  { name:"Suji 1kg", localName:"सूजी 1 किलो", price:85, costPrice:65, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.suji },

  // ── POHA ──────────────────────────────────────────────────────────────────
  { name:"Poha Khula", localName:"पोहा खुला", price:22, costPrice:16, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.poha },
  { name:"Poha 500g", localName:"पोहा 500 ग्राम", price:38, costPrice:28, baseUnit:"pkt", baseQuantity:1, packetWeight:500, packetUnit:"g", imageUrl:IMG.poha },
  { name:"Poha 1kg", localName:"पोहा 1 किलो", price:72, costPrice:55, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.poha },

  // ── SABUDANA ──────────────────────────────────────────────────────────────
  { name:"Sabudana Khula", localName:"साबूदाना खुला", price:28, costPrice:20, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.sabudana },
  { name:"Sabudana 500g", localName:"साबूदाना 500 ग्राम", price:52, costPrice:40, baseUnit:"pkt", baseQuantity:1, packetWeight:500, packetUnit:"g", imageUrl:IMG.sabudana },
  { name:"Sabudana 1kg", localName:"साबूदाना 1 किलो", price:98, costPrice:76, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.sabudana },

  // ── DALIYA (BROKEN WHEAT) ─────────────────────────────────────────────────
  { name:"Daliya Khula", localName:"दलिया खुला", price:20, costPrice:14, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.daliya },
  { name:"Daliya 500g", localName:"दलिया 500 ग्राम", price:38, costPrice:28, baseUnit:"pkt", baseQuantity:1, packetWeight:500, packetUnit:"g", imageUrl:IMG.daliya },
  { name:"Daliya 1kg", localName:"दलिया 1 किलो", price:72, costPrice:55, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.daliya },

  // ── CORN / MAKKA ──────────────────────────────────────────────────────────
  { name:"Makka Atta 1kg", localName:"मक्का आटा 1 किलो", price:42, costPrice:32, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.corn },
  { name:"Corn Flour 500g", localName:"कॉर्न फ्लोर 500 ग्राम", price:55, costPrice:42, baseUnit:"pkt", baseQuantity:1, packetWeight:500, packetUnit:"g", imageUrl:IMG.corn },

  // ── OATS ──────────────────────────────────────────────────────────────────
  { name:"Quaker Oats 200g", localName:"क्वेकर ओट्स 200 ग्राम", price:65, costPrice:50, baseUnit:"pkt", baseQuantity:1, packetWeight:200, packetUnit:"g", imageUrl:IMG.oats },
  { name:"Quaker Oats 500g", localName:"क्वेकर ओट्स 500 ग्राम", price:145, costPrice:115, baseUnit:"pkt", baseQuantity:1, packetWeight:500, packetUnit:"g", imageUrl:IMG.oats },
  { name:"Saffola Oats 500g", localName:"सफोला ओट्स 500 ग्राम", price:135, costPrice:106, baseUnit:"pkt", baseQuantity:1, packetWeight:500, packetUnit:"g", imageUrl:IMG.oats },

  // ── MILLETS ───────────────────────────────────────────────────────────────
  { name:"Bajra Khula", localName:"बाजरा खुला", price:18, costPrice:12, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.millet },
  { name:"Bajra 1kg", localName:"बाजरा 1 किलो", price:35, costPrice:26, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.millet },
  { name:"Jowar Khula", localName:"ज्वार खुला", price:20, costPrice:14, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.millet },
  { name:"Jowar 1kg", localName:"ज्वार 1 किलो", price:38, costPrice:28, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.millet },
  { name:"Ragi Khula", localName:"रागी खुला", price:22, costPrice:16, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.millet },
  { name:"Ragi 500g", localName:"रागी 500 ग्राम", price:42, costPrice:32, baseUnit:"pkt", baseQuantity:1, packetWeight:500, packetUnit:"g", imageUrl:IMG.millet },

  // ── SEWAI / VERMICELLI ────────────────────────────────────────────────────
  { name:"Sewai 200g", localName:"सेवई 200 ग्राम", price:28, costPrice:20, baseUnit:"pkt", baseQuantity:1, packetWeight:200, packetUnit:"g", imageUrl:IMG.suji },
  { name:"Sewai 500g", localName:"सेवई 500 ग्राम", price:62, costPrice:47, baseUnit:"pkt", baseQuantity:1, packetWeight:500, packetUnit:"g", imageUrl:IMG.suji },
];

async function main() {
  console.log("Seeding Grains & Cereals...");
  const existing = await getDocs(query(collection(db,"products"),where("shopId","==",SHOP_ID)));
  const existingNames = new Set(existing.docs.map(d=>d.data().name?.toLowerCase().trim()));
  let added=0, skipped=0;
  for (const item of PRODUCTS) {
    if (existingNames.has(item.name.toLowerCase().trim())) { console.log("Skip:", item.name); skipped++; continue; }
    await addDoc(collection(db,"products"), { ...item, category:CAT, barcode:null, shopId:SHOP_ID });
    console.log("Added:", item.name);
    added++;
  }
  console.log("Added:", added, "| Skipped:", skipped);
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
