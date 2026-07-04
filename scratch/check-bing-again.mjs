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
  const shopId = "Yvgf5Us3pdNGHa0ljBGr";
  
  const snap = await getDocs(query(collection(db, "products"), where("shopId", "==", shopId)));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const targetCats = ["Oral Care", "Tea & Coffee"];
  const items = all.filter(p => p.category && (p.category.toLowerCase().includes("oral") || p.category.toLowerCase().includes("tea")));

  let bingCount = 0;
  for (const p of items) {
    if (p.imageUrl && p.imageUrl.includes("bing.net")) {
      console.log(`Found bing URL: ${p.imageUrl}`);
      bingCount++;
    }
  }

  console.log(`Total items with bing urls in shop ${shopId}: ${bingCount}`);
  process.exit(0);
}

main();
