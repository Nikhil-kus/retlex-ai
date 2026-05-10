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
const CAT = "Tobacco & Pan";

const IMG = {
  pan:     "https://images.openfoodfacts.org/images/products/890/139/638/9712/front_en.3.400.jpg",
  tobacco: "https://images.openfoodfacts.org/images/products/890/139/302/6672/front_en.3.400.jpg",
  supari:  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Areca_catechu_fruits.jpg/320px-Areca_catechu_fruits.jpg",
  bidi:    "https://images.openfoodfacts.org/images/products/890/139/924/6012/front_en.3.400.jpg",
};

const PRODUCTS = [
  // ── SUPARI / BETEL NUT ────────────────────────────────────────────────────
  { name:"Supari Khula", localName:"सुपारी खुला", price:20, costPrice:14, baseUnit:"g", baseQuantity:100, imageUrl:IMG.supari },
  { name:"Supari Packet Small", localName:"सुपारी पैकेट छोटा", price:5, costPrice:3, baseUnit:"pc", imageUrl:IMG.supari },
  { name:"Supari Packet Big", localName:"सुपारी पैकेट बड़ा", price:10, costPrice:7, baseUnit:"pc", imageUrl:IMG.supari },
  { name:"Rajnigandha Supari", localName:"राजनीगंधा सुपारी", price:5, costPrice:3, baseUnit:"pc", imageUrl:IMG.supari },
  { name:"Rajnigandha Silver Pearls", localName:"राजनीगंधा सिल्वर पर्ल्स", price:10, costPrice:7, baseUnit:"pc", imageUrl:IMG.supari },
  { name:"Pass Pass Supari", localName:"पास पास सुपारी", price:2, costPrice:1, baseUnit:"pc", imageUrl:IMG.supari },

  // ── PAN MASALA ────────────────────────────────────────────────────────────
  { name:"Pan Parag", localName:"पान पराग", price:5, costPrice:3, baseUnit:"pc", imageUrl:IMG.pan },
  { name:"Pan Parag Big", localName:"पान पराग बड़ा", price:10, costPrice:7, baseUnit:"pc", imageUrl:IMG.pan },
  { name:"Manikchand Pan Masala", localName:"माणिकचंद पान मसाला", price:5, costPrice:3, baseUnit:"pc", imageUrl:IMG.pan },
  { name:"Vimal Pan Masala", localName:"विमल पान मसाला", price:5, costPrice:3, baseUnit:"pc", imageUrl:IMG.pan },
  { name:"Tulsi Pan Masala", localName:"तुलसी पान मसाला", price:2, costPrice:1, baseUnit:"pc", imageUrl:IMG.pan },
  { name:"Goa Pan Masala", localName:"गोवा पान मसाला", price:5, costPrice:3, baseUnit:"pc", imageUrl:IMG.pan },

  // ── GUTKHA / KHAINI ───────────────────────────────────────────────────────
  { name:"Khaini Packet", localName:"खैनी पैकेट", price:5, costPrice:3, baseUnit:"pc", imageUrl:IMG.tobacco },
  { name:"Khaini Khula", localName:"खैनी खुला", price:10, costPrice:7, baseUnit:"g", baseQuantity:10, imageUrl:IMG.tobacco },
  { name:"Zarda Packet", localName:"जर्दा पैकेट", price:5, costPrice:3, baseUnit:"pc", imageUrl:IMG.tobacco },

  // ── CIGARETTE ─────────────────────────────────────────────────────────────
  { name:"Gold Flake Kings (Single)", localName:"गोल्ड फ्लेक किंग्स एक", price:15, costPrice:12, baseUnit:"pc", imageUrl:IMG.tobacco },
  { name:"Gold Flake Kings (Pack of 10)", localName:"गोल्ड फ्लेक किंग्स 10 पीस", price:145, costPrice:115, baseUnit:"pc", imageUrl:IMG.tobacco },
  { name:"Classic Milds (Single)", localName:"क्लासिक माइल्ड्स एक", price:15, costPrice:12, baseUnit:"pc", imageUrl:IMG.tobacco },
  { name:"Four Square (Single)", localName:"फोर स्क्वायर एक", price:12, costPrice:9, baseUnit:"pc", imageUrl:IMG.tobacco },
  { name:"Wills Navy Cut (Single)", localName:"विल्स नेवी कट एक", price:15, costPrice:12, baseUnit:"pc", imageUrl:IMG.tobacco },

  // ── BIDI ──────────────────────────────────────────────────────────────────
  { name:"Bidi Bundle (25 pcs)", localName:"बीड़ी बंडल 25 पीस", price:15, costPrice:11, baseUnit:"pc", imageUrl:IMG.bidi },
  { name:"Bidi Bundle (50 pcs)", localName:"बीड़ी बंडल 50 पीस", price:28, costPrice:21, baseUnit:"pc", imageUrl:IMG.bidi },

  // ── MOUTH FRESHENER ───────────────────────────────────────────────────────
  { name:"Mouth Freshener Packet", localName:"माउथ फ्रेशनर पैकेट", price:5, costPrice:3, baseUnit:"pc", imageUrl:IMG.pan },
  { name:"Mukhwas Khula", localName:"मुखवास खुला", price:15, costPrice:10, baseUnit:"g", baseQuantity:100, imageUrl:IMG.pan },
  { name:"Saunf Mishri Mix", localName:"सौंफ मिश्री मिक्स", price:10, costPrice:7, baseUnit:"pc", imageUrl:IMG.pan },
];

async function main() {
  console.log("Seeding Tobacco & Pan...");
  const existing = await getDocs(query(collection(db,"products"),where("shopId","==",SHOP_ID)));
  const existingNames = new Set(existing.docs.map(d=>d.data().name?.toLowerCase().trim()));
  let added=0, skipped=0;
  for (const item of PRODUCTS) {
    if (existingNames.has(item.name.toLowerCase().trim())) { skipped++; continue; }
    await addDoc(collection(db,"products"), {
      name:item.name, localName:item.localName, price:item.price, costPrice:item.costPrice,
      baseUnit:item.baseUnit, baseQuantity:item.baseQuantity||1,
      packetWeight:null, packetUnit:null,
      imageUrl:item.imageUrl, category:CAT, barcode:null, shopId:SHOP_ID
    });
    console.log("Added:", item.name);
    added++;
  }
  console.log("Added:", added, "| Skipped:", skipped);
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
