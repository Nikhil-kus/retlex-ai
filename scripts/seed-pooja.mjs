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
const CAT = "Pooja Items";

const IMG = {
  agarbatti: "https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg",
  dhoop:     "https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg",
  camphor:   "https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg",
  diya:      "https://images.openfoodfacts.org/images/products/890/103/086/5169/front_en.3.400.jpg",
  kumkum:    "https://images.openfoodfacts.org/images/products/890/154/200/1246/front_en.3.400.jpg",
};

const PRODUCTS = [
  // Agarbatti
  { name:"Cycle Agarbatti", localName:"साइकिल अगरबत्ती", price:30, img:IMG.agarbatti },
  { name:"Patanjali Agarbatti", localName:"पतंजलि अगरबत्ती", price:25, img:IMG.agarbatti },
  { name:"Mangaldeep Agarbatti", localName:"मंगलदीप अगरबत्ती", price:35, img:IMG.agarbatti },
  { name:"Hem Agarbatti", localName:"हेम अगरबत्ती", price:30, img:IMG.agarbatti },
  // Dhoop
  { name:"Dhoop Batti", localName:"धूप बत्ती", price:20, img:IMG.dhoop },
  { name:"Dhoop Cone", localName:"धूप कोन", price:25, img:IMG.dhoop },
  // Camphor
  { name:"Kapoor (Camphor)", localName:"कपूर", price:15, img:IMG.camphor },
  { name:"Kapoor Tablet Pack", localName:"कपूर टैबलेट पैक", price:25, img:IMG.camphor },
  // Diya & Oil
  { name:"Diya (Mitti ka)", localName:"दीया मिट्टी का", price:10, img:IMG.diya },
  { name:"Sarso Tel Pooja 100ml", localName:"सरसों तेल पूजा 100 मिली", price:25, img:IMG.diya },
  { name:"Til Tel Pooja 100ml", localName:"तिल तेल पूजा 100 मिली", price:30, img:IMG.diya },
  // Kumkum & Haldi
  { name:"Kumkum Packet", localName:"कुमकुम पैकेट", price:10, img:IMG.kumkum },
  { name:"Sindoor Packet", localName:"सिंदूर पैकेट", price:10, img:IMG.kumkum },
  { name:"Haldi Pooja Packet", localName:"हल्दी पूजा पैकेट", price:10, img:IMG.kumkum },
  // Flowers & Garland
  { name:"Phool Mala (Artificial)", localName:"फूल माला आर्टिफिशियल", price:20, img:IMG.diya },
  // Coconut
  { name:"Nariyal Pooja", localName:"नारियल पूजा", price:25, img:IMG.diya },
];

async function main() {
  console.log("Seeding Pooja Items...");
  const existing = await getDocs(query(collection(db,"products"),where("shopId","==",SHOP_ID)));
  const existingNames = new Set(existing.docs.map(d=>d.data().name?.toLowerCase().trim()));
  let added=0, skipped=0;
  for (const item of PRODUCTS) {
    if (existingNames.has(item.name.toLowerCase().trim())) { skipped++; continue; }
    await addDoc(collection(db,"products"), {
      name:item.name, localName:item.localName, price:item.price,
      costPrice:Math.round(item.price*0.75),
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
