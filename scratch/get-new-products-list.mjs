import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';

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

async function main() {
  const snap = await getDocs(query(collection(db, "products"), where("shopId", "==", SHOP_ID)));
  const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const targets = products.filter(p => {
    const n = p.name.toLowerCase();
    return (
      n.includes("dettol") || n.includes("detol") ||
      n.includes("ruchi") || n.includes("krati") || n.includes("kriti") ||
      n.includes("chhola") || n.includes("moong") || n.includes("rava") ||
      n.includes("kolam") || n.includes("everest") || n.includes("jeeravan") ||
      n.includes("tan man") || n.includes("tide") || n.includes("surf excel") ||
      n.includes("ghadi") || n.includes("rin") ||
      n.includes("catch") || n.includes("pushp")
    );
  });

  console.log(`Found ${targets.length} target products.`);
  const productData = targets.map(t => ({ id: t.id, name: t.name, category: t.category, imageUrl: t.imageUrl || '' }));
  fs.writeFileSync('scratch/new_products_list.json', JSON.stringify(productData, null, 2));
  console.log('Saved to scratch/new_products_list.json');
  process.exit(0);
}

main().catch(console.error);
