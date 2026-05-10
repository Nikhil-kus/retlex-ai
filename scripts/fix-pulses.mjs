import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, deleteDoc, query, where } from "firebase/firestore";
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
  chana:  "https://images.openfoodfacts.org/images/products/890/178/614/0503/front_en.3.400.jpg",
  moong:  "https://images.openfoodfacts.org/images/products/890/600/102/3043/front_en.3.400.jpg",
  masoor: "https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg",
  urad:   "https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg",
  toor:   "https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg",
  rajma:  "https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg",
  kabuli: "https://images.openfoodfacts.org/images/products/890/154/200/1246/front_en.3.400.jpg",
  lobiya: "https://images.openfoodfacts.org/images/products/890/120/703/1717/front_en.3.400.jpg",
};

// All dals sold loose per kg with quality grades
// price = per kg selling price
const DALS = [
  // Chana Dal
  { name:"Chana Dal", localName:"चना दाल", price:90, img:IMG.chana },
  { name:"Chana Dal Premium", localName:"चना दाल प्रीमियम", price:110, img:IMG.chana },
  // Moong Dal (split yellow)
  { name:"Moong Dal", localName:"मूंग दाल", price:110, img:IMG.moong },
  { name:"Moong Dal Premium", localName:"मूंग दाल प्रीमियम", price:130, img:IMG.moong },
  // Moong Sabut (whole green)
  { name:"Moong Sabut", localName:"मूंग साबुत", price:100, img:IMG.moong },
  // Masoor Dal (red split)
  { name:"Masoor Dal", localName:"मसूर दाल", price:85, img:IMG.masoor },
  { name:"Masoor Dal Premium", localName:"मसूर दाल प्रीमियम", price:100, img:IMG.masoor },
  // Masoor Sabut (whole brown)
  { name:"Masoor Sabut", localName:"मसूर साबुत", price:80, img:IMG.masoor },
  // Urad Dal (split white)
  { name:"Urad Dal", localName:"उड़द दाल", price:120, img:IMG.urad },
  { name:"Urad Dal Premium", localName:"उड़द दाल प्रीमियम", price:145, img:IMG.urad },
  // Urad Sabut (whole black)
  { name:"Urad Sabut", localName:"उड़द साबुत", price:115, img:IMG.urad },
  // Toor Dal (arhar)
  { name:"Toor Dal", localName:"तूर दाल", price:130, img:IMG.toor },
  { name:"Toor Dal Premium", localName:"तूर दाल प्रीमियम", price:155, img:IMG.toor },
  // Rajma
  { name:"Rajma", localName:"राजमा", price:140, img:IMG.rajma },
  { name:"Rajma Chitra", localName:"राजमा चित्रा", price:150, img:IMG.rajma },
  // Kabuli Chana
  { name:"Kabuli Chana", localName:"काबुली चना", price:120, img:IMG.kabuli },
  // Kala Chana
  { name:"Kala Chana", localName:"काला चना", price:85, img:IMG.chana },
  // Lobiya
  { name:"Lobiya", localName:"लोबिया", price:90, img:IMG.lobiya },
  // Moth Dal
  { name:"Moth Dal", localName:"मोठ दाल", price:95, img:IMG.masoor },
  // Arhar Dal (same as toor but different name used in some regions)
  { name:"Arhar Dal", localName:"अरहर दाल", price:130, img:IMG.toor },
  // Chana Sabut
  { name:"Chana Sabut", localName:"चना साबुत", price:75, img:IMG.chana },
];

async function main() {
  console.log("Fixing Pulses & Dals...");
  const snap = await getDocs(query(collection(db,"products"),where("shopId","==",SHOP_ID),where("category","==",CAT)));
  const existing = snap.docs.map(d=>({id:d.id,...d.data()}));
  const existingNames = new Set(existing.map(p=>p.name?.toLowerCase().trim()));

  // Step 1: Fix existing khula products — change baseUnit to kg, fix price to per-kg
  let fixed=0;
  for (const p of existing) {
    if (p.baseUnit === "g" && p.name.includes("Khula")) {
      // Convert: price was per 100g, multiply by 10 for per kg
      const perKgPrice = p.price * 10;
      const perKgCost = Math.round(perKgPrice * 0.78);
      await updateDoc(doc(db,"products",p.id), {
        baseUnit: "kg",
        baseQuantity: 1,
        price: perKgPrice,
        costPrice: perKgCost,
        packetWeight: null,
        packetUnit: null,
      });
      console.log("Fixed unit:", p.name, "-> ₹"+perKgPrice+"/kg");
      fixed++;
    }
    // Fix old products with undefined baseUnit
    if (!p.baseUnit || p.baseUnit === "undefined") {
      await updateDoc(doc(db,"products",p.id), {
        baseUnit: "kg",
        baseQuantity: 1,
        packetWeight: null,
        packetUnit: null,
      });
      console.log("Fixed baseUnit:", p.name);
      fixed++;
    }
  }

  // Step 2: Add new quality variants that don't exist yet
  let added=0;
  for (const dal of DALS) {
    const key = dal.name.toLowerCase().trim();
    // Skip if already exists (including khula version)
    if (existingNames.has(key) || existingNames.has(key+" khula")) {
      // Update existing with correct data
      const match = existing.find(p => p.name.toLowerCase().trim() === key || p.name.toLowerCase().trim() === key+" khula");
      if (match && (!match.imageUrl || match.imageUrl.includes("default"))) {
        await updateDoc(doc(db,"products",match.id), { imageUrl: dal.img });
      }
      continue;
    }
    await addDoc(collection(db,"products"), {
      name: dal.name,
      localName: dal.localName,
      price: dal.price,
      costPrice: Math.round(dal.price * 0.78),
      baseUnit: "kg",
      baseQuantity: 1,
      packetWeight: null,
      packetUnit: null,
      imageUrl: dal.img,
      category: CAT,
      barcode: null,
      shopId: SHOP_ID,
    });
    console.log("Added:", dal.name, "@ ₹"+dal.price+"/kg");
    added++;
  }

  console.log("\nFixed:", fixed, "| Added:", added);
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
