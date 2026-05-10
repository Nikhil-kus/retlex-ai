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
const CAT = "Biscuits & Snacks";

const IMG = {
  biscuit: "https://images.openfoodfacts.org/images/products/890/171/912/3870/front_en.3.400.jpg",
  chips:   "https://images.openfoodfacts.org/images/products/890/434/070/0137/front_en.3.400.jpg",
  namkeen: "https://images.openfoodfacts.org/images/products/890/601/050/2232/front_en.3.400.jpg",
  cream:   "https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg",
};

const PRODUCTS = [
  // ── PARLE BISCUITS ────────────────────────────────────────────────────────
  { name:"Parle-G 100g", localName:"पारले-जी 100 ग्राम", price:10, costPrice:7, img:IMG.biscuit },
  { name:"Parle-G 250g", localName:"पारले-जी 250 ग्राम", price:25, costPrice:19, img:IMG.biscuit },
  { name:"Parle-G 500g", localName:"पारले-जी 500 ग्राम", price:50, costPrice:38, img:IMG.biscuit },
  { name:"Parle Hide & Seek", localName:"पारले हाइड एंड सीक", price:30, costPrice:23, img:IMG.cream },
  { name:"Parle Krackjack", localName:"पारले क्रैकजैक", price:20, costPrice:15, img:IMG.biscuit },
  { name:"Parle Monaco", localName:"पारले मोनाको", price:20, costPrice:15, img:IMG.biscuit },
  { name:"Parle 20-20 Cashew", localName:"पारले 20-20 काजू", price:30, costPrice:23, img:IMG.biscuit },

  // ── BRITANNIA BISCUITS ────────────────────────────────────────────────────
  { name:"Britannia Marie Gold 250g", localName:"ब्रिटानिया मैरी गोल्ड 250 ग्राम", price:30, costPrice:23, img:IMG.biscuit },
  { name:"Britannia Good Day 100g", localName:"ब्रिटानिया गुड डे 100 ग्राम", price:20, costPrice:15, img:IMG.biscuit },
  { name:"Britannia Good Day 250g", localName:"ब्रिटानिया गुड डे 250 ग्राम", price:50, costPrice:38, img:IMG.biscuit },
  { name:"Britannia Bourbon 100g", localName:"ब्रिटानिया बॉर्बन 100 ग्राम", price:30, costPrice:23, img:IMG.cream },
  { name:"Britannia Treat Cream", localName:"ब्रिटानिया ट्रीट क्रीम", price:20, costPrice:15, img:IMG.cream },
  { name:"Britannia NutriChoice", localName:"ब्रिटानिया न्यूट्रीचॉइस", price:35, costPrice:27, img:IMG.biscuit },
  { name:"Britannia 50-50", localName:"ब्रिटानिया 50-50", price:20, costPrice:15, img:IMG.biscuit },
  { name:"Britannia Tiger Biscuit", localName:"ब्रिटानिया टाइगर बिस्किट", price:10, costPrice:7, img:IMG.biscuit },

  // ── SUNFEAST / ITC ────────────────────────────────────────────────────────
  { name:"Sunfeast Dark Fantasy", localName:"सनफीस्ट डार्क फैंटेसी", price:30, costPrice:23, img:IMG.cream },
  { name:"Sunfeast Farmlite Oats", localName:"सनफीस्ट फार्मलाइट ओट्स", price:35, costPrice:27, img:IMG.biscuit },
  { name:"Sunfeast Yippee Biscuit", localName:"सनफीस्ट यिप्पी बिस्किट", price:20, costPrice:15, img:IMG.biscuit },

  // ── CHIPS & WAFERS ────────────────────────────────────────────────────────
  { name:"Lays Classic 26g", localName:"लेज़ क्लासिक 26 ग्राम", price:20, costPrice:15, img:IMG.chips },
  { name:"Lays 52g", localName:"लेज़ 52 ग्राम", price:40, costPrice:30, img:IMG.chips },
  { name:"Kurkure Masala Munch 50g", localName:"कुरकुरे मसाला मंच 50 ग्राम", price:20, costPrice:15, img:IMG.chips },
  { name:"Kurkure 90g", localName:"कुरकुरे 90 ग्राम", price:35, costPrice:26, img:IMG.chips },
  { name:"Bingo Mad Angles", localName:"बिंगो मैड एंगल्स", price:20, costPrice:15, img:IMG.chips },
  { name:"Pringles 107g", localName:"प्रिंगल्स 107 ग्राम", price:99, costPrice:77, img:IMG.chips },
  { name:"Uncle Chips 26g", localName:"अंकल चिप्स 26 ग्राम", price:20, costPrice:15, img:IMG.chips },

  // ── NAMKEEN ───────────────────────────────────────────────────────────────
  { name:"Haldiram Aloo Bhujia 200g", localName:"हल्दीराम आलू भुजिया 200 ग्राम", price:55, costPrice:42, img:IMG.namkeen },
  { name:"Haldiram Mixture 200g", localName:"हल्दीराम मिक्सचर 200 ग्राम", price:55, costPrice:42, img:IMG.namkeen },
  { name:"Haldiram Moong Dal 200g", localName:"हल्दीराम मूंग दाल 200 ग्राम", price:55, costPrice:42, img:IMG.namkeen },
  { name:"Haldiram Sev 200g", localName:"हल्दीराम सेव 200 ग्राम", price:50, costPrice:38, img:IMG.namkeen },
  { name:"Bikaji Bhujia 200g", localName:"बीकाजी भुजिया 200 ग्राम", price:50, costPrice:38, img:IMG.namkeen },
  { name:"Bikaji Mixture 200g", localName:"बीकाजी मिक्सचर 200 ग्राम", price:50, costPrice:38, img:IMG.namkeen },
  { name:"Namkeen Khula", localName:"नमकीन खुला", price:15, costPrice:10, baseUnit:"g", baseQuantity:100, img:IMG.namkeen },

  // ── RUSK & TOAST ──────────────────────────────────────────────────────────
  { name:"Britannia Rusk 200g", localName:"ब्रिटानिया रस्क 200 ग्राम", price:45, costPrice:34, img:IMG.biscuit },
  { name:"Parle Rusk 200g", localName:"पारले रस्क 200 ग्राम", price:40, costPrice:30, img:IMG.biscuit },
  { name:"Atta Biscuit 250g", localName:"आटा बिस्किट 250 ग्राम", price:30, costPrice:23, img:IMG.biscuit },
];

async function main() {
  console.log("Seeding Biscuits & Snacks...");
  const existing = await getDocs(query(collection(db,"products"),where("shopId","==",SHOP_ID)));
  const existingNames = new Set(existing.docs.map(d=>d.data().name?.toLowerCase().trim()));
  let added=0, skipped=0;
  for (const item of PRODUCTS) {
    if (existingNames.has(item.name.toLowerCase().trim())) { skipped++; continue; }
    await addDoc(collection(db,"products"), {
      name:item.name, localName:item.localName, price:item.price, costPrice:item.costPrice,
      baseUnit: item.baseUnit || "pc", baseQuantity: item.baseQuantity || 1,
      packetWeight:null, packetUnit:null,
      imageUrl:item.img, category:CAT, barcode:null, shopId:SHOP_ID
    });
    console.log("Added:", item.name);
    added++;
  }
  console.log("Added:", added, "| Skipped:", skipped);
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
