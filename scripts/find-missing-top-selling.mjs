/**
 * find-missing-top-selling.mjs
 * Searches Firestore products for the 4 missing items by name.
 */
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

const SEARCH = ["chana", "tomato", "salt", "parle-g", "parle g"];

async function main() {
  const snap = await getDocs(
    query(collection(db, "products"), where("shopId", "==", SHOP_ID))
  );
  const all = snap.docs.map((d) => ({ id: d.id, name: d.data().name, localName: d.data().localName }));

  for (const term of SEARCH) {
    const matches = all.filter(p =>
      (p.name || "").toLowerCase().includes(term) ||
      (p.localName || "").toLowerCase().includes(term)
    );
    console.log(`\n🔍 "${term}" (${matches.length} matches):`);
    matches.slice(0, 8).forEach(p => console.log(`   id: ${p.id}  name: ${p.name}`));
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
