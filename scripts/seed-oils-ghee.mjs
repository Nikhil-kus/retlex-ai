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
const CAT = "Oils & Ghee";

const IMG = {
  oil:   "https://images.openfoodfacts.org/images/products/890/600/102/3043/front_en.3.400.jpg",
  ghee:  "https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg",
  mustard:"https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg",
};

const PRODUCTS = [
  // ── LOOSE OIL ─────────────────────────────────────────────────────────────
  { name:"Sarson Tel Khula", localName:"सरसों तेल खुला", price:18, costPrice:14, baseUnit:"g", baseQuantity:100, imageUrl:IMG.mustard },
  { name:"Refined Tel Khula", localName:"रिफाइंड तेल खुला", price:14, costPrice:10, baseUnit:"g", baseQuantity:100, imageUrl:IMG.oil },

  // ── MUSTARD OIL ───────────────────────────────────────────────────────────
  { name:"Mustard Oil 500ml", localName:"सरसों तेल 500 मिली", price:95, costPrice:74, baseUnit:"pkt", packetWeight:500, packetUnit:"ml", imageUrl:IMG.mustard },
  { name:"Mustard Oil 1L", localName:"सरसों तेल 1 लीटर", price:180, costPrice:141, baseUnit:"pkt", packetWeight:1000, packetUnit:"ml", imageUrl:IMG.mustard },
  { name:"Mustard Oil 5L", localName:"सरसों तेल 5 लीटर", price:870, costPrice:685, baseUnit:"pkt", packetWeight:5000, packetUnit:"ml", imageUrl:IMG.mustard },
  { name:"Patanjali Mustard Oil 1L", localName:"पतंजलि सरसों तेल 1 लीटर", price:175, costPrice:138, baseUnit:"pkt", packetWeight:1000, packetUnit:"ml", imageUrl:IMG.mustard },

  // ── REFINED OIL ───────────────────────────────────────────────────────────
  { name:"Fortune Refined Oil 1L", localName:"फॉर्च्यून रिफाइंड तेल 1 लीटर", price:150, costPrice:118, baseUnit:"pkt", packetWeight:1000, packetUnit:"ml", imageUrl:IMG.oil },
  { name:"Fortune Refined Oil 5L", localName:"फॉर्च्यून रिफाइंड तेल 5 लीटर", price:720, costPrice:567, baseUnit:"pkt", packetWeight:5000, packetUnit:"ml", imageUrl:IMG.oil },
  { name:"Dhara Refined Oil 1L", localName:"धारा रिफाइंड तेल 1 लीटर", price:145, costPrice:114, baseUnit:"pkt", packetWeight:1000, packetUnit:"ml", imageUrl:IMG.oil },
  { name:"Saffola Gold Oil 1L", localName:"सफोला गोल्ड तेल 1 लीटर", price:195, costPrice:154, baseUnit:"pkt", packetWeight:1000, packetUnit:"ml", imageUrl:IMG.oil },
  { name:"Sunflower Oil 1L", localName:"सनफ्लावर तेल 1 लीटर", price:155, costPrice:122, baseUnit:"pkt", packetWeight:1000, packetUnit:"ml", imageUrl:IMG.oil },

  // ── GROUNDNUT OIL ─────────────────────────────────────────────────────────
  { name:"Groundnut Oil 1L", localName:"मूंगफली तेल 1 लीटर", price:185, costPrice:146, baseUnit:"pkt", packetWeight:1000, packetUnit:"ml", imageUrl:IMG.oil },

  // ── GHEE ──────────────────────────────────────────────────────────────────
  { name:"Amul Ghee 200ml", localName:"अमूल घी 200 मिली", price:115, costPrice:90, baseUnit:"pkt", packetWeight:200, packetUnit:"ml", imageUrl:IMG.ghee },
  { name:"Amul Ghee 500ml", localName:"अमूल घी 500 मिली", price:275, costPrice:217, baseUnit:"pkt", packetWeight:500, packetUnit:"ml", imageUrl:IMG.ghee },
  { name:"Amul Ghee 1L", localName:"अमूल घी 1 लीटर", price:545, costPrice:430, baseUnit:"pkt", packetWeight:1000, packetUnit:"ml", imageUrl:IMG.ghee },
  { name:"Patanjali Ghee 500ml", localName:"पतंजलि घी 500 मिली", price:255, costPrice:201, baseUnit:"pkt", packetWeight:500, packetUnit:"ml", imageUrl:IMG.ghee },
  { name:"Patanjali Ghee 1L", localName:"पतंजलि घी 1 लीटर", price:505, costPrice:398, baseUnit:"pkt", packetWeight:1000, packetUnit:"ml", imageUrl:IMG.ghee },
  { name:"Ghee Khula", localName:"घी खुला", price:55, costPrice:43, baseUnit:"g", baseQuantity:100, imageUrl:IMG.ghee },

  // ── VANASPATI ─────────────────────────────────────────────────────────────
  { name:"Dalda Vanaspati 500g", localName:"डालडा वनस्पति 500 ग्राम", price:85, costPrice:67, baseUnit:"pkt", packetWeight:500, packetUnit:"g", imageUrl:IMG.oil },
  { name:"Rath Vanaspati 1kg", localName:"रथ वनस्पति 1 किलो", price:155, costPrice:122, baseUnit:"pkt", packetWeight:1000, packetUnit:"g", imageUrl:IMG.oil },
];

async function main() {
  console.log("Fixing & Seeding Oils & Ghee...");
  const snap = await getDocs(query(collection(db,"products"),where("shopId","==",SHOP_ID)));
  const all = snap.docs.map(d=>({id:d.id,...d.data()}));

  // Fix Foil wrongly in Oils & Ghee
  for (const p of all) {
    if (p.category === CAT && p.name === "Foil") {
      await updateDoc(doc(db,"products",p.id), { category:"Household Essentials" });
      console.log("Moved Foil -> Household Essentials");
    }
  }

  const existingNames = new Set(all.map(d=>d.name?.toLowerCase().trim()));
  let added=0, skipped=0;
  for (const item of PRODUCTS) {
    if (existingNames.has(item.name.toLowerCase().trim())) { skipped++; continue; }
    await addDoc(collection(db,"products"), {
      name:item.name, localName:item.localName, price:item.price, costPrice:item.costPrice,
      baseUnit:item.baseUnit, baseQuantity:item.baseUnit==="g"?item.baseQuantity:1,
      packetWeight:item.packetWeight||null, packetUnit:item.packetUnit||null,
      imageUrl:item.imageUrl, category:CAT, barcode:null, shopId:SHOP_ID
    });
    console.log("Added:", item.name);
    added++;
  }
  console.log("Added:", added, "| Skipped:", skipped);
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
