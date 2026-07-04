import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";

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
  
  const badItems = all.filter(p => 
    p.category && 
    (p.category.toLowerCase().includes("oral") || p.category.toLowerCase().includes("tea")) &&
    p.imageUrl && p.imageUrl.includes("tse1.mm.bing.net")
  );

  console.log(`Found ${badItems.length} items with bad bing thumbnail URLs in Oral Care / Tea & Coffee.`);
  
  badItems.forEach(p => {
    console.log(`- ${p.name} (Cat: ${p.category})`);
  });

  process.exit(0);
}

main();
