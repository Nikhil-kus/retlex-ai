/**
 * Seed Spices & Masala products
 * Usage: node scripts/seed-spices.mjs
 */
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

const firebaseConfig = {
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const SHOP_ID = "NjGBnhsc25w4jb2q6Ol4";
const CAT = "Spices & Masala";

// Verified Wikipedia Commons image URLs for spices
const IMG = {
  haldi:    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Turmeric_powder_and_root.jpg/320px-Turmeric_powder_and_root.jpg",
  mirchi:   "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Red_Chili_Pepper_Cross_Section.jpg/320px-Red_Chili_Pepper_Cross_Section.jpg",
  dhaniya:  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Coriander_seeds.jpg/320px-Coriander_seeds.jpg",
  jeera:    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Cumin_seeds.jpg/320px-Cumin_seeds.jpg",
  garam:    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Garam_masala.jpg/320px-Garam_masala.jpg",
  rai:      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Mustard_seeds.jpg/320px-Mustard_seeds.jpg",
  methi:    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Fenugreek_seeds.jpg/320px-Fenugreek_seeds.jpg",
  ajwain:   "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Ajwain_seeds.jpg/320px-Ajwain_seeds.jpg",
  saunf:    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Fennel_seeds.jpg/320px-Fennel_seeds.jpg",
  kali_mirch: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Black_pepper.jpg/320px-Black_pepper.jpg",
  laung:    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Cloves.jpg/320px-Cloves.jpg",
  dalchini: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Cinnamon_sticks.jpg/320px-Cinnamon_sticks.jpg",
  elaichi:  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Cardamom_pods.jpg/320px-Cardamom_pods.jpg",
  tej_patta:"https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Bay_leaves.jpg/320px-Bay_leaves.jpg",
  hing:     "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Asafoetida.jpg/320px-Asafoetida.jpg",
  amchur:   "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Amchur_powder.jpg/320px-Amchur_powder.jpg",
  chaat:    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Chaat_masala.jpg/320px-Chaat_masala.jpg",
  sabzi:    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Sabzi_masala.jpg/320px-Sabzi_masala.jpg",
  chicken:  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Chicken_masala.jpg/320px-Chicken_masala.jpg",
  biryani:  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Biryani_masala.jpg/320px-Biryani_masala.jpg",
  paneer:   "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Paneer_masala.jpg/320px-Paneer_masala.jpg",
  kesar:    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Saffron_crocus.jpg/320px-Saffron_crocus.jpg",
  imli:     "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tamarind.jpg/320px-Tamarind.jpg",
  khus:     "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Poppy_seeds.jpg/320px-Poppy_seeds.jpg",
  til:      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Sesame_seeds.jpg/320px-Sesame_seeds.jpg",
  off_haldi:   "https://images.openfoodfacts.org/images/products/890/178/100/0376/front_en.3.400.jpg",
  off_mirchi:  "https://images.openfoodfacts.org/images/products/890/178/614/0503/front_en.3.400.jpg",
  off_dhaniya: "https://images.openfoodfacts.org/images/products/890/178/100/0376/front_en.3.400.jpg",
  off_masala:  "https://images.openfoodfacts.org/images/products/890/178/614/0503/front_en.3.400.jpg",
};

const PRODUCTS = [
  // ── WHOLE SPICES (KHULA) ──────────────────────────────────────────────────
  { name:"Jeera Khula", localName:"जीरा खुला", price:25, costPrice:18, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.jeera },
  { name:"Rai Khula", localName:"राई खुला", price:12, costPrice:8, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.rai },
  { name:"Methi Dana Khula", localName:"मेथी दाना खुला", price:15, costPrice:10, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.methi },
  { name:"Ajwain Khula", localName:"अजवाइन खुला", price:20, costPrice:14, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.ajwain },
  { name:"Saunf Khula", localName:"सौंफ खुला", price:18, costPrice:12, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.saunf },
  { name:"Kali Mirch Khula", localName:"काली मिर्च खुला", price:45, costPrice:35, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.kali_mirch },
  { name:"Laung Khula", localName:"लौंग खुला", price:80, costPrice:62, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.laung },
  { name:"Dalchini Khula", localName:"दालचीनी खुला", price:35, costPrice:26, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.dalchini },
  { name:"Badi Elaichi Khula", localName:"बड़ी इलायची खुला", price:120, costPrice:95, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.elaichi },
  { name:"Tej Patta Khula", localName:"तेज पत्ता खुला", price:15, costPrice:10, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.tej_patta },
  { name:"Imli Khula", localName:"इमली खुला", price:20, costPrice:14, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.imli },
  { name:"Sabut Lal Mirch Khula", localName:"साबुत लाल मिर्च खुला", price:30, costPrice:22, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.mirchi },
  { name:"Sabut Dhaniya Khula", localName:"साबुत धनिया खुला", price:18, costPrice:12, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.dhaniya },
  { name:"Haldi Khula", localName:"हल्दी खुला", price:22, costPrice:15, baseUnit:"g", baseQuantity:100, packetWeight:null, packetUnit:null, imageUrl:IMG.haldi },

  // ── POWDER SPICES (PACKET) ────────────────────────────────────────────────
  { name:"Haldi Powder 100g", localName:"हल्दी पाउडर 100 ग्राम", price:28, costPrice:20, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.off_haldi },
  { name:"Haldi Powder 200g", localName:"हल्दी पाउडर 200 ग्राम", price:52, costPrice:38, baseUnit:"pkt", baseQuantity:1, packetWeight:200, packetUnit:"g", imageUrl:IMG.off_haldi },
  { name:"Lal Mirch Powder 100g", localName:"लाल मिर्च पाउडर 100 ग्राम", price:32, costPrice:23, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.off_mirchi },
  { name:"Lal Mirch Powder 200g", localName:"लाल मिर्च पाउडर 200 ग्राम", price:60, costPrice:44, baseUnit:"pkt", baseQuantity:1, packetWeight:200, packetUnit:"g", imageUrl:IMG.off_mirchi },
  { name:"Dhaniya Powder 100g", localName:"धनिया पाउडर 100 ग्राम", price:28, costPrice:20, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.off_dhaniya },
  { name:"Dhaniya Powder 200g", localName:"धनिया पाउडर 200 ग्राम", price:52, costPrice:38, baseUnit:"pkt", baseQuantity:1, packetWeight:200, packetUnit:"g", imageUrl:IMG.off_dhaniya },
  { name:"Jeera Powder 100g", localName:"जीरा पाउडर 100 ग्राम", price:35, costPrice:25, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.jeera },
  { name:"Garam Masala 50g", localName:"गरम मसाला 50 ग्राम", price:38, costPrice:28, baseUnit:"pkt", baseQuantity:1, packetWeight:50, packetUnit:"g", imageUrl:IMG.off_masala },
  { name:"Garam Masala 100g", localName:"गरम मसाला 100 ग्राम", price:70, costPrice:52, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.off_masala },
  { name:"Amchur Powder 100g", localName:"अमचूर पाउडर 100 ग्राम", price:35, costPrice:25, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.amchur },
  { name:"Chaat Masala 100g", localName:"चाट मसाला 100 ग्राम", price:40, costPrice:30, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.chaat },
  { name:"Kali Mirch Powder 50g", localName:"काली मिर्च पाउडर 50 ग्राम", price:55, costPrice:42, baseUnit:"pkt", baseQuantity:1, packetWeight:50, packetUnit:"g", imageUrl:IMG.kali_mirch },
  { name:"Hing 25g", localName:"हींग 25 ग्राम", price:45, costPrice:34, baseUnit:"pkt", baseQuantity:1, packetWeight:25, packetUnit:"g", imageUrl:IMG.hing },
  { name:"Hing 50g", localName:"हींग 50 ग्राम", price:85, costPrice:65, baseUnit:"pkt", baseQuantity:1, packetWeight:50, packetUnit:"g", imageUrl:IMG.hing },

  // ── BRANDED MASALA PACKETS ────────────────────────────────────────────────
  { name:"MDH Chhole Masala 100g", localName:"एमडीएच छोले मसाला 100 ग्राम", price:55, costPrice:42, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.off_masala },
  { name:"MDH Rajma Masala 100g", localName:"एमडीएच राजमा मसाला 100 ग्राम", price:55, costPrice:42, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.off_masala },
  { name:"MDH Kitchen King 100g", localName:"एमडीएच किचन किंग 100 ग्राम", price:60, costPrice:46, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.off_masala },
  { name:"MDH Pav Bhaji Masala 100g", localName:"एमडीएच पाव भाजी मसाला 100 ग्राम", price:55, costPrice:42, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.off_masala },
  { name:"Everest Chicken Masala 100g", localName:"एवरेस्ट चिकन मसाला 100 ग्राम", price:65, costPrice:50, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.off_masala },
  { name:"Everest Biryani Masala 50g", localName:"एवरेस्ट बिरयानी मसाला 50 ग्राम", price:45, costPrice:34, baseUnit:"pkt", baseQuantity:1, packetWeight:50, packetUnit:"g", imageUrl:IMG.off_masala },
  { name:"Everest Pav Bhaji Masala 100g", localName:"एवरेस्ट पाव भाजी मसाला 100 ग्राम", price:55, costPrice:42, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.off_masala },
  { name:"Everest Sabzi Masala 100g", localName:"एवरेस्ट सब्जी मसाला 100 ग्राम", price:55, costPrice:42, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.off_masala },
  { name:"Patanjali Haldi 200g", localName:"पतंजलि हल्दी 200 ग्राम", price:45, costPrice:34, baseUnit:"pkt", baseQuantity:1, packetWeight:200, packetUnit:"g", imageUrl:IMG.off_haldi },
  { name:"Patanjali Dhaniya Powder 200g", localName:"पतंजलि धनिया पाउडर 200 ग्राम", price:42, costPrice:32, baseUnit:"pkt", baseQuantity:1, packetWeight:200, packetUnit:"g", imageUrl:IMG.off_dhaniya },
  { name:"Patanjali Mirch Powder 200g", localName:"पतंजलि मिर्च पाउडर 200 ग्राम", price:45, costPrice:34, baseUnit:"pkt", baseQuantity:1, packetWeight:200, packetUnit:"g", imageUrl:IMG.off_mirchi },

  // ── SEEDS & MISC ──────────────────────────────────────────────────────────
  { name:"Khus Khus 100g", localName:"खसखस 100 ग्राम", price:65, costPrice:50, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.khus },
  { name:"Til Safed 200g", localName:"तिल सफेद 200 ग्राम", price:35, costPrice:25, baseUnit:"pkt", baseQuantity:1, packetWeight:200, packetUnit:"g", imageUrl:IMG.til },
  { name:"Saunf Packet 100g", localName:"सौंफ पैकेट 100 ग्राम", price:22, costPrice:15, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.saunf },
  { name:"Ajwain Packet 100g", localName:"अजवाइन पैकेट 100 ग्राम", price:25, costPrice:18, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.ajwain },
  { name:"Methi Dana Packet 100g", localName:"मेथी दाना पैकेट 100 ग्राम", price:20, costPrice:14, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.methi },
  { name:"Rai Packet 100g", localName:"राई पैकेट 100 ग्राम", price:15, costPrice:10, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.rai },
  { name:"Jeera Packet 100g", localName:"जीरा पैकेट 100 ग्राम", price:30, costPrice:22, baseUnit:"pkt", baseQuantity:1, packetWeight:100, packetUnit:"g", imageUrl:IMG.jeera },
  { name:"Kali Mirch Packet 50g", localName:"काली मिर्च पैकेट 50 ग्राम", price:50, costPrice:38, baseUnit:"pkt", baseQuantity:1, packetWeight:50, packetUnit:"g", imageUrl:IMG.kali_mirch },
  { name:"Laung Packet 25g", localName:"लौंग पैकेट 25 ग्राम", price:45, costPrice:34, baseUnit:"pkt", baseQuantity:1, packetWeight:25, packetUnit:"g", imageUrl:IMG.laung },
  { name:"Dalchini Packet 50g", localName:"दालचीनी पैकेट 50 ग्राम", price:30, costPrice:22, baseUnit:"pkt", baseQuantity:1, packetWeight:50, packetUnit:"g", imageUrl:IMG.dalchini },
  { name:"Tej Patta Packet 25g", localName:"तेज पत्ता पैकेट 25 ग्राम", price:18, costPrice:12, baseUnit:"pkt", baseQuantity:1, packetWeight:25, packetUnit:"g", imageUrl:IMG.tej_patta },
  { name:"Imli Packet 200g", localName:"इमली पैकेट 200 ग्राम", price:28, costPrice:20, baseUnit:"pkt", baseQuantity:1, packetWeight:200, packetUnit:"g", imageUrl:IMG.imli },
];

async function main() {
  console.log("Seeding Spices & Masala products...");
  const existing = await getDocs(query(collection(db,"products"),where("shopId","==",SHOP_ID)));
  const existingNames = new Set(existing.docs.map(d=>d.data().name?.toLowerCase().trim()));
  let added=0, skipped=0;
  for (const item of PRODUCTS) {
    if (existingNames.has(item.name.toLowerCase().trim())) { skipped++; continue; }
    await addDoc(collection(db,"products"), { ...item, category:CAT, barcode:null, shopId:SHOP_ID });
    console.log("Added:", item.name);
    added++;
  }
  console.log("Added:", added, "| Skipped:", skipped);
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1);});
