import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
  storageBucket: "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId: "1:339712048398:web:578ac498b0c942db7aab5f",
});
const db = getFirestore(app);

async function main() {
  const shopsSnap = await getDocs(collection(db, "shops"));
  let shopId = null;
  for (const d of shopsSnap.docs) {
    if ((d.data().name || "").toLowerCase().includes("krishna")) { shopId = d.id; break; }
  }

  const snap = await getDocs(query(collection(db, "products"), where("shopId", "==", shopId)));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const without = all.filter(p => !p.imageUrl || !p.imageUrl.startsWith("http"));

  console.log("Total products without image:", without.length);
  without.forEach(p => {
    console.log(`- ${p.name} (Local: ${p.localName || 'N/A'})`);
    console.log(`  Price: ${p.price}, Weight/Quantity: ${p.baseQuantity} ${p.baseUnit}`);
    console.log(`  ID: ${p.id}, Category: ${p.category}`);
    console.log();
  });
  process.exit(0);
}

main();
