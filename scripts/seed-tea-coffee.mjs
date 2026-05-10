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
const CAT = "Tea & Coffee";

const IMG = {
  tea:    "https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg",
  coffee: "https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg",
  green:  "https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg",
  health: "https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg",
};

const PRODUCTS = [
  // ── LOOSE TEA (KHULA) ─────────────────────────────────────────────────────
  { name:"Chai Patti Khula", localName:"चाय पत्ती खुला", price:35, costPrice:26, baseUnit:"g", baseQuantity:100, imageUrl:IMG.tea },

  // ── TATA TEA ──────────────────────────────────────────────────────────────
  { name:"Tata Tea Gold 100g", localName:"टाटा टी गोल्ड 100 ग्राम", price:65, costPrice:50, baseUnit:"pkt", packetWeight:100, packetUnit:"g", imageUrl:IMG.tea },
  { name:"Tata Tea Gold 250g", localName:"टाटा टी गोल्ड 250 ग्राम", price:155, costPrice:122, baseUnit:"pkt", packetWeight:250, packetUnit:"g", imageUrl:IMG.tea },
  { name:"Tata Tea Gold 500g", localName:"टाटा टी गोल्ड 500 ग्राम", price:295, costPrice:233, baseUnit:"pkt", packetWeight:500, packetUnit:"g", imageUrl:IMG.tea },
  { name:"Tata Tea Premium 250g", localName:"टाटा टी प्रीमियम 250 ग्राम", price:130, costPrice:102, baseUnit:"pkt", packetWeight:250, packetUnit:"g", imageUrl:IMG.tea },
  { name:"Tata Tea Agni 250g", localName:"टाटा टी अग्नि 250 ग्राम", price:110, costPrice:86, baseUnit:"pkt", packetWeight:250, packetUnit:"g", imageUrl:IMG.tea },

  // ── BROOKE BOND / RED LABEL ───────────────────────────────────────────────
  { name:"Red Label 100g", localName:"रेड लेबल 100 ग्राम", price:55, costPrice:42, baseUnit:"pkt", packetWeight:100, packetUnit:"g", imageUrl:IMG.tea },
  { name:"Red Label 250g", localName:"रेड लेबल 250 ग्राम", price:130, costPrice:102, baseUnit:"pkt", packetWeight:250, packetUnit:"g", imageUrl:IMG.tea },
  { name:"Red Label 500g", localName:"रेड लेबल 500 ग्राम", price:250, costPrice:197, baseUnit:"pkt", packetWeight:500, packetUnit:"g", imageUrl:IMG.tea },
  { name:"Taj Mahal Tea 100g", localName:"ताज महल चाय 100 ग्राम", price:75, costPrice:58, baseUnit:"pkt", packetWeight:100, packetUnit:"g", imageUrl:IMG.tea },
  { name:"Taj Mahal Tea 250g", localName:"ताज महल चाय 250 ग्राम", price:175, costPrice:138, baseUnit:"pkt", packetWeight:250, packetUnit:"g", imageUrl:IMG.tea },
  { name:"3 Roses Tea 250g", localName:"3 रोज़ेज़ चाय 250 ग्राम", price:115, costPrice:90, baseUnit:"pkt", packetWeight:250, packetUnit:"g", imageUrl:IMG.tea },

  // ── WAGH BAKRI ────────────────────────────────────────────────────────────
  { name:"Wagh Bakri Tea 250g", localName:"वाघ बकरी चाय 250 ग्राम", price:145, costPrice:114, baseUnit:"pkt", packetWeight:250, packetUnit:"g", imageUrl:IMG.tea },
  { name:"Wagh Bakri Tea 500g", localName:"वाघ बकरी चाय 500 ग्राम", price:280, costPrice:221, baseUnit:"pkt", packetWeight:500, packetUnit:"g", imageUrl:IMG.tea },

  // ── LIPTON ────────────────────────────────────────────────────────────────
  { name:"Lipton Yellow Label 250g", localName:"लिप्टन येलो लेबल 250 ग्राम", price:130, costPrice:102, baseUnit:"pkt", packetWeight:250, packetUnit:"g", imageUrl:IMG.tea },
  { name:"Lipton Green Tea 25 bags", localName:"लिप्टन ग्रीन टी 25 बैग्स", price:95, costPrice:74, baseUnit:"pkt", packetWeight:25, packetUnit:"g", imageUrl:IMG.green },

  // ── TEA BAGS ──────────────────────────────────────────────────────────────
  { name:"Tata Tea Bags 25 pcs", localName:"टाटा टी बैग्स 25 पीस", price:65, costPrice:50, baseUnit:"pkt", packetWeight:25, packetUnit:"g", imageUrl:IMG.tea },
  { name:"Red Label Tea Bags 25 pcs", localName:"रेड लेबल टी बैग्स 25 पीस", price:65, costPrice:50, baseUnit:"pkt", packetWeight:25, packetUnit:"g", imageUrl:IMG.tea },

  // ── NESCAFE / COFFEE ──────────────────────────────────────────────────────
  { name:"Nescafe Classic 25g", localName:"नेस्काफे क्लासिक 25 ग्राम", price:85, costPrice:66, baseUnit:"pkt", packetWeight:25, packetUnit:"g", imageUrl:IMG.coffee },
  { name:"Nescafe Classic 50g", localName:"नेस्काफे क्लासिक 50 ग्राम", price:160, costPrice:126, baseUnit:"pkt", packetWeight:50, packetUnit:"g", imageUrl:IMG.coffee },
  { name:"Nescafe Classic 100g", localName:"नेस्काफे क्लासिक 100 ग्राम", price:295, costPrice:233, baseUnit:"pkt", packetWeight:100, packetUnit:"g", imageUrl:IMG.coffee },
  { name:"Nescafe Sunrise 50g", localName:"नेस्काफे सनराइज 50 ग्राम", price:130, costPrice:102, baseUnit:"pkt", packetWeight:50, packetUnit:"g", imageUrl:IMG.coffee },
  { name:"Nescafe Sunrise 100g", localName:"नेस्काफे सनराइज 100 ग्राम", price:245, costPrice:193, baseUnit:"pkt", packetWeight:100, packetUnit:"g", imageUrl:IMG.coffee },

  // ── BRU COFFEE ────────────────────────────────────────────────────────────
  { name:"Bru Instant Coffee 50g", localName:"ब्रू इंस्टेंट कॉफी 50 ग्राम", price:130, costPrice:102, baseUnit:"pkt", packetWeight:50, packetUnit:"g", imageUrl:IMG.coffee },
  { name:"Bru Instant Coffee 100g", localName:"ब्रू इंस्टेंट कॉफी 100 ग्राम", price:245, costPrice:193, baseUnit:"pkt", packetWeight:100, packetUnit:"g", imageUrl:IMG.coffee },
  { name:"Bru Gold Coffee 50g", localName:"ब्रू गोल्ड कॉफी 50 ग्राम", price:175, costPrice:138, baseUnit:"pkt", packetWeight:50, packetUnit:"g", imageUrl:IMG.coffee },

  // ── HEALTH DRINKS ─────────────────────────────────────────────────────────
  { name:"Horlicks 200g", localName:"हॉर्लिक्स 200 ग्राम", price:115, costPrice:90, baseUnit:"pkt", packetWeight:200, packetUnit:"g", imageUrl:IMG.health },
  { name:"Horlicks 500g", localName:"हॉर्लिक्स 500 ग्राम", price:265, costPrice:209, baseUnit:"pkt", packetWeight:500, packetUnit:"g", imageUrl:IMG.health },
  { name:"Bournvita 200g", localName:"बॉर्नविटा 200 ग्राम", price:115, costPrice:90, baseUnit:"pkt", packetWeight:200, packetUnit:"g", imageUrl:IMG.health },
  { name:"Bournvita 500g", localName:"बॉर्नविटा 500 ग्राम", price:265, costPrice:209, baseUnit:"pkt", packetWeight:500, packetUnit:"g", imageUrl:IMG.health },
  { name:"Complan 200g", localName:"कॉम्प्लान 200 ग्राम", price:145, costPrice:114, baseUnit:"pkt", packetWeight:200, packetUnit:"g", imageUrl:IMG.health },
  { name:"Boost 200g", localName:"बूस्ट 200 ग्राम", price:115, costPrice:90, baseUnit:"pkt", packetWeight:200, packetUnit:"g", imageUrl:IMG.health },
];

async function main() {
  console.log("Fixing & Seeding Tea & Coffee...");
  const snap = await getDocs(query(collection(db,"products"),where("shopId","==",SHOP_ID)));
  const all = snap.docs.map(d=>({id:d.id,...d.data()}));

  // Fix wrongly categorized products
  for (const p of all) {
    if (p.category === CAT && (p.name.includes("Toothbrush") || p.name.includes("Toothpaste"))) {
      await updateDoc(doc(db,"products",p.id), { category:"Oral Care" });
      console.log("Moved to Oral Care:", p.name);
    }
  }

  // Add new products
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
