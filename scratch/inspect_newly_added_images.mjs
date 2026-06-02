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

async function main() {
  const snap = await getDocs(query(collection(db, "products"), where("shopId", "==", SHOP_ID)));
  const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Filter products matching our recently added categories/brands
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

  console.log(`Total target products inspected: ${targets.length}`);
  targets.forEach((p, idx) => {
    console.log(`${idx + 1}. [${p.id}] "${p.name}"`);
    console.log(`   Image: "${p.imageUrl || 'NONE'}"`);
    console.log(`   Category: "${p.category || 'NONE'}"`);
    console.log('---');
  });

  process.exit(0);
}

main().catch(console.error);
