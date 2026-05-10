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
const CAT = "Pulses & Dals";

const IMG = {
  chana:   "https://images.openfoodfacts.org/images/products/890/178/614/0503/front_en.3.400.jpg",
  moong:   "https://images.openfoodfacts.org/images/products/890/600/102/3043/front_en.3.400.jpg",
  masoor:  "https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg",
  urad:    "https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg",
  toor:    "https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg",
  rajma:   "https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg",
  kabuli:  "https://images.openfoodfacts.org/images/products/890/154/200/1246/front_en.3.400.jpg",
  lobiya:  "https://images.openfoodfacts.org/images/products/890/120/703/1717/front_en.3.400.jpg",
};

// Helper to create khula + 500g + 1kg variants
function dal(name, localName, pricePerKg, img) {
  const cp = Math.round(pricePerKg * 0.78);
  return [
    { name:`${name} Khula`, localName:`${localName} खुला`, price:Math.round(pricePerKg/10), costPrice:Math.round(cp/10), baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:img },
    { name:`${name} 500g`, localName:`${localName} 500 ग्राम`, price:Math.round(pricePerKg/2), costPrice:Math.round(cp/2), baseUnit:"pkt", baseQuantity:1, packetWeight:500, packetUnit:"g", imageUrl:img },
    { name:`${name} 1kg`, localName:`${localName} 1 किलो`, price:pricePerKg, costPrice:cp, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:img },
    { name:`${name} 2kg`, localName:`${localName} 2 किलो`, price:pricePerKg*2, costPrice:cp*2, baseUnit:"pkt", baseQuantity:1, packetWeight:2000, packetUnit:"g", imageUrl:img },
  ];
}

const PRODUCTS = [
  // Chana Dal
  ...dal("Chana Dal", "चना दाल", 90, IMG.chana),
  // Moong Dal (split yellow)
  ...dal("Moong Dal", "मूंग दाल", 110, IMG.moong),
  // Moong Sabut (whole green)
  ...dal("Moong Sabut", "मूंग साबुत", 100, IMG.moong),
  // Masoor Dal (red lentil)
  ...dal("Masoor Dal", "मसूर दाल", 85, IMG.masoor),
  // Masoor Sabut
  ...dal("Masoor Sabut", "मसूर साबुत", 80, IMG.masoor),
  // Urad Dal (split black)
  ...dal("Urad Dal", "उड़द दाल", 120, IMG.urad),
  // Urad Sabut (whole black)
  ...dal("Urad Sabut", "उड़द साबुत", 115, IMG.urad),
  // Toor Dal (arhar)
  ...dal("Toor Dal", "तूर दाल", 130, IMG.toor),
  // Rajma (kidney beans)
  ...dal("Rajma", "राजमा", 140, IMG.rajma),
  // Rajma Chitra
  { name:"Rajma Chitra 500g", localName:"राजमा चित्रा 500 ग्राम", price:75, costPrice:58, baseUnit:"pkt", baseQuantity:1, packetWeight:500, packetUnit:"g", imageUrl:IMG.rajma },
  { name:"Rajma Chitra 1kg", localName:"राजमा चित्रा 1 किलो", price:145, costPrice:113, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.rajma },
  // Kabuli Chana (white chickpeas)
  ...dal("Kabuli Chana", "काबुली चना", 120, IMG.kabuli),
  // Kala Chana (black chickpeas)
  ...dal("Kala Chana", "काला चना", 85, IMG.chana),
  // Lobiya (black-eyed peas)
  ...dal("Lobiya", "लोबिया", 90, IMG.lobiya),
  // Moth Dal
  { name:"Moth Dal Khula", localName:"मोठ दाल खुला", price:10, costPrice:7, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.masoor },
  { name:"Moth Dal 500g", localName:"मोठ दाल 500 ग्राम", price:48, costPrice:37, baseUnit:"pkt", baseQuantity:1, packetWeight:500, packetUnit:"g", imageUrl:IMG.masoor },
  { name:"Moth Dal 1kg", localName:"मोठ दाल 1 किलो", price:92, costPrice:72, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.masoor },
  // Branded - Tata Sampann
  { name:"Tata Sampann Chana Dal 1kg", localName:"टाटा संपन्न चना दाल 1 किलो", price:105, costPrice:82, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.chana },
  { name:"Tata Sampann Toor Dal 1kg", localName:"टाटा संपन्न तूर दाल 1 किलो", price:145, costPrice:114, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.toor },
  { name:"Tata Sampann Moong Dal 1kg", localName:"टाटा संपन्न मूंग दाल 1 किलो", price:125, costPrice:98, baseUnit:"pkt", baseQuantity:1, packetWeight:1000, packetUnit:"g", imageUrl:IMG.moong },
];

async function main() {
  console.log("Seeding Pulses & Dals...");
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
