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

async function checkRealUrl(url) {
  if (!url || !url.startsWith("http")) return false;
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(2000),
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    return res.ok || res.status === 403; // some CDNs return 403 for HEAD, which is fine, means image exists
  } catch (e) {
    return false;
  }
}

async function main() {
  const shopId = "Yvgf5Us3pdNGHa0ljBGr";
  
  const snap = await getDocs(query(collection(db, "products"), where("shopId", "==", shopId)));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const items = all.filter(p => p.category && (p.category.toLowerCase().includes("oral") || p.category.toLowerCase().includes("tea")));

  console.log(`Checking ${items.length} items...`);
  
  const broken = [];
  for (const p of items) {
    if (p.imageUrl && p.imageUrl.includes("bigbasket.com")) continue; // assume BigBasket is always good
    
    const isOk = await checkRealUrl(p.imageUrl);
    if (!isOk) {
      broken.push(p);
      console.log(`❌ ${p.name} - ${p.imageUrl}`);
    } else {
      console.log(`✅ ${p.name} - ${p.imageUrl}`);
    }
  }

  console.log(`Found ${broken.length} actually broken images.`);
  process.exit(0);
}
main();
