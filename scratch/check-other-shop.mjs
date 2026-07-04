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

async function checkUrl(url) {
  if (!url || !url.startsWith("http")) return false;
  if (url.includes("tse1.mm.bing.net") || url.includes("fmcghouse.com") || url.includes("roopsi.in") || url.includes("incidecoder") || url.includes("exportersindia")) {
    return false;
  }
  return true;
}

async function main() {
  const shopId = "PyecarRrYeP4Nx2VqZLd";
  
  const snap = await getDocs(query(collection(db, "products"), where("shopId", "==", shopId)));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const targetCats = ["Oral Care", "Tea & Coffee"];
  const items = all.filter(p => p.category && (p.category.toLowerCase().includes("oral") || p.category.toLowerCase().includes("tea")));

  console.log(`Found ${items.length} items in matching categories in shop ${shopId}.`);
  
  let broken = 0;
  for (const p of items) {
    if (!(await checkUrl(p.imageUrl))) {
      broken++;
    }
  }

  console.log(`Of those, ${broken} have broken images.`);
  process.exit(0);
}

main();
