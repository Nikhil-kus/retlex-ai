/**
 * fix-top-selling-missing.mjs
 * Sets sortOrder on the 4 products that were not found in the first pass.
 * Uses real Firestore IDs discovered by find-missing-top-selling.mjs
 */
import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

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

// Real Firestore IDs + their assigned order slots
const FIXES = [
  { order: 5,  id: "5M1V3f4JUXecK5Mvgs3Y",   label: "Chana (loose)" },
  { order: 7,  id: "nTGrAkMJdC1Et3Phejuk",    label: "Fun Top Tomato Sauce Bottle" },
  { order: 9,  id: "0b5qRbdSpoofetyg31by",    label: "Tata Salt 1kg (Namak)" },
  { order: 11, id: "P2roDb6KsibAsxpWPUMp",    label: "Parle-G Biscuit (Bulk 56 pcs)" },
];

async function main() {
  console.log("🔧 Fixing missing top-selling sortOrders...\n");
  for (const f of FIXES) {
    await updateDoc(doc(db, "products", f.id), { sortOrder: f.order });
    console.log(`  ✅ [${f.order}] ${f.label}  (id: ${f.id})`);
  }
  console.log("\n✅ All 4 fixed. Top Selling now has all 14 products set.");
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
