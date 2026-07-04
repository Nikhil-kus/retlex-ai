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
  
  // Find matching items (case insensitive category match if needed)
  const items = all.filter(p => p.category && (p.category.toLowerCase().includes("oral") || p.category.toLowerCase().includes("tea")));

  console.log(`Found ${items.length} items in matching categories.`);
  
  items.slice(0, 20).forEach(p => {
    console.log(`- [${p.category}] ${p.name} - URL: ${p.imageUrl}`);
  });

  process.exit(0);
}

main();
