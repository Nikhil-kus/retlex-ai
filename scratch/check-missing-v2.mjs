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
  console.log("Available Shops:");
  for (const d of shopsSnap.docs) {
    const shopName = d.data().name || "";
    console.log(`- ${shopName} (${d.id})`);
    if (shopName.toLowerCase().includes("shri krishna kirana")) { 
      shopId = d.id; 
    }
  }

  if (!shopId) {
    console.log("Shop not found.");
    process.exit(1);
  }

  console.log(`\nSelected Shop ID: ${shopId}`);

  const snap = await getDocs(query(collection(db, "products"), where("shopId", "==", shopId)));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Check what kind of URLs the products have
  const missing = all.filter(p => {
    if (!p.imageUrl) return true;
    if (typeof p.imageUrl !== 'string') return true;
    const url = p.imageUrl.trim().toLowerCase();
    if (url === '' || url === 'null' || url.includes('placeholder') || !url.startsWith('http')) return true;
    return false;
  });

  console.log(`\nTotal products in this shop: ${all.length}`);
  console.log(`Products identified as missing images: ${missing.length}`);
  
  missing.forEach(p => {
    console.log(`- [${p.category || 'No Cat'}] ${p.name} (Local: ${p.localName || 'N/A'}) - URL: ${p.imageUrl}`);
    console.log(`  ID: ${p.id} | Price: ${p.price} | Weight: ${p.baseQuantity} ${p.baseUnit}`);
  });

  process.exit(0);
}

main();
