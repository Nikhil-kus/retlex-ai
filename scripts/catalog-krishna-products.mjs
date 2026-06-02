import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import fs from "fs";

const firebaseConfig = {
  apiKey:            "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain:        "retlex-ai.firebaseapp.com",
  projectId:         "retlex-ai",
  storageBucket:     "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId:             "1:339712048398:web:578ac498b0c942db7aab5f",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db  = getFirestore(app);

async function main() {
  const shopId = 'Yvgf5Us3pdNGHa0ljBGr';
  const q = query(collection(db, "products"), where("shopId", "==", shopId));
  const snap = await getDocs(q);
  const products = snap.docs.map(doc => ({
    id: doc.id,
    name: doc.data().name,
    localName: doc.data().localName,
    imageUrl: doc.data().imageUrl,
    category: doc.data().category
  }));

  fs.writeFileSync('krishna-products-catalog.json', JSON.stringify(products, null, 2));
  console.log(`Saved ${products.length} products to krishna-products-catalog.json`);
  process.exit(0);
}

main().catch(console.error);
