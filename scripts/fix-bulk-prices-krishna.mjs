/**
 * fix-bulk-prices-krishna.mjs
 * Updates bulk carton prices to realistic wholesale rates.
 * Wholesale shops typically sell bulk at 8-12% below MRP.
 *
 * Run: node scripts/fix-bulk-prices-krishna.mjs
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
  storageBucket: "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId: "1:339712048398:web:578ac498b0c942db7aab5f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Wholesale price corrections (selling price to other shops)
// Key = product name substring, value = { price, costPrice }
const BULK_PRICE_MAP = {
  // ₹5 biscuits — bulk 56 pcs carton
  "Parle-G Biscuit (Bulk 56": { price: 245, costPrice: 220 },
  "Parle-G Gluco Biscuit (Bulk 56": { price: 245, costPrice: 220 },
  "Naariyal Biscuit (Bulk 48": { price: 200, costPrice: 180 },
  "Britannia Jim Jam Biscuit (Bulk 48": { price: 210, costPrice: 190 },
  "Britannia Tiger Biscuit (Bulk 48": { price: 210, costPrice: 190 },
  "Britannia Tiger Cream Biscuit (Bulk 48": { price: 210, costPrice: 190 },
  "Britannia Nice Biscuit (Bulk 48": { price: 210, costPrice: 190 },
  "Sunfeast Magix Biscuit (Bulk 48": { price: 210, costPrice: 190 },
  "Oreo Biscuit (Bulk 48": { price: 210, costPrice: 190 },
  "Patanjali Biscuit (Bulk 48": { price: 200, costPrice: 180 },
  "Patanjali Milk Shakti Biscuit (Bulk 48": { price: 200, costPrice: 180 },
  "Kismi Toffee Bar (Bulk 60": { price: 260, costPrice: 235 },

  // ₹10 biscuits — bulk 24 pcs carton
  "Parle-G Gold Biscuit (Bulk 24": { price: 215, costPrice: 195 },
  "Monaco Biscuit (Bulk 24": { price: 215, costPrice: 195 },
  "KrackJack Biscuit (Bulk 24": { price: 215, costPrice: 195 },
  "Parle 20-20 Biscuit (Bulk 24": { price: 215, costPrice: 195 },
  "Parle Bourbon Biscuit (Bulk 24": { price: 215, costPrice: 195 },
  "Parle Hide & Seek Biscuit (Bulk 24": { price: 215, costPrice: 195 },
  "Britannia Good Day Biscuit (Bulk 24": { price: 215, costPrice: 195 },
  "Britannia Marie Gold Biscuit (Bulk 24": { price: 215, costPrice: 195 },
  "Britannia Marie Biscuit (Bulk 24": { price: 215, costPrice: 195 },
  "Britannia Bourbon Biscuit (Bulk 24": { price: 215, costPrice: 195 },
  "Britannia Nutri Choice Biscuit (Bulk 24": { price: 215, costPrice: 195 },
  "Britannia Mom's Magic Biscuit (Bulk 24": { price: 215, costPrice: 195 },
  "Britannia Rusk (Bulk 24": { price: 215, costPrice: 195 },
  "Sunfeast Dark Fantasy Biscuit (Bulk 24": { price: 215, costPrice: 195 },
  "Parle Toast (Bulk 24": { price: 215, costPrice: 195 },
  "Parle 50-50 Gol Maal Biscuit (Bulk 24": { price: 215, costPrice: 195 },
  "D-Dark Cookies (Bulk 24": { price: 215, costPrice: 195 },
};

async function main() {
  const shopsSnap = await getDocs(collection(db, "shops"));
  let shopId = null;
  for (const d of shopsSnap.docs) {
    if ((d.data().name || "").toLowerCase().includes("krishna")) {
      shopId = d.id;
      break;
    }
  }
  if (!shopId) { console.error("Shop not found"); process.exit(1); }

  const productsSnap = await getDocs(
    query(collection(db, "products"), where("shopId", "==", shopId))
  );

  let updated = 0;
  for (const d of productsSnap.docs) {
    const name = d.data().name || "";
    for (const [key, prices] of Object.entries(BULK_PRICE_MAP)) {
      if (name.startsWith(key)) {
        await updateDoc(doc(db, "products", d.id), prices);
        console.log(`  ✅ Updated: ${name} → ₹${prices.price}`);
        updated++;
        break;
      }
    }
  }

  console.log(`\n✅ Updated ${updated} bulk product prices`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
