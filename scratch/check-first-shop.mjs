import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, limit } from "firebase/firestore";

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
  console.log("All Shops in Firestore:");
  let firstShop = shopsSnap.docs[0];
  for (const d of shopsSnap.docs) {
    console.log(`- ${d.data().name} (${d.id})`);
  }
  
  if (firstShop) {
    console.log(`\nFallback (first doc) Shop ID: ${firstShop.id} -> ${firstShop.data().name}`);
    const snap = await getDocs(query(collection(db, "products"), where("shopId", "==", firstShop.id)));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const bad = all.filter(p => !p.imageUrl || !p.imageUrl.startsWith("http") || p.imageUrl.includes("tse1.mm.bing.net") || p.imageUrl.includes("fmcghouse.com"));
    console.log(`Fallback shop has ${all.length} products. Bad images: ${bad.length}`);
  }

  process.exit(0);
}
main();
