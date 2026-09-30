/**
 * verify-top-selling.mjs  — quick read-back check
 */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";

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
const SHOP_ID = "Yvgf5Us3pdNGHa0ljBGr";

// The 14 IDs we tried to set
const IDS = [
  { order: 1,  id: "rW7a1xYOH7fAPqIuTFPQ" },
  { order: 2,  id: "2dwxfLOBceK8GxjhRyYC" },
  { order: 3,  id: "BbjN3N7qlNG7bMHEtAHq" },
  { order: 4,  id: "WjcprXC0GQOglD5ghnFs" },
  { order: 5,  id: "5M1V3f4JUXecK5Mvgs3Y" },
  { order: 6,  id: "2vF6TP6B6xy0niETH6uz" },
  { order: 7,  id: "nTGrAkMJdC1Et3Phejuk" },
  { order: 8,  id: "1XOE0m7E5G9SiXJsoymg" },
  { order: 9,  id: "0b5qRbdSpoofetyg31by" },
  { order: 10, id: "14zQrMAWe4azXO8L2vDF" },
  { order: 11, id: "P2roDb6KsibAsxpWPUMp" },
  { order: 12, id: "3cf8dtJ1rTmYa0whKIfS" },
  { order: 13, id: "rUsHStQk2dh2PVQCAzpM" },
  { order: 14, id: "6fkXzQKoMIRebVuxr1tI" },
];

async function main() {
  console.log("Checking each product doc directly from Firestore...\n");
  let ok = 0, fail = 0;
  for (const { order, id } of IDS) {
    const snap = await getDoc(doc(db, "products", id));
    if (!snap.exists()) {
      console.log(`[${order}] ❌ DOC NOT FOUND  id=${id}`);
      fail++;
    } else {
      const d = snap.data();
      const shopMatch = d.shopId === SHOP_ID ? "✅" : `❌ WRONG shopId=${d.shopId}`;
      const sortOk = d.sortOrder === order ? "✅" : `❌ sortOrder=${d.sortOrder}`;
      console.log(`[${order}] ${sortOk} shopId:${shopMatch}  "${d.name}"`);
      if (d.sortOrder === order && d.shopId === SHOP_ID) ok++; else fail++;
    }
  }
  console.log(`\n${ok}/14 correct, ${fail} issues`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
