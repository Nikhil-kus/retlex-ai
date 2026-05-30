import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

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

  const BAD_PATTERNS = [
    'eporner', 'lovepik', 'wordstemplates', 'alamy', 'medical', 'template', 'kuruma-news', 'ytimg', 'youtube'
  ];

  console.log(`Checking ${products.length} products for bad image URLs...`);
  let resetCount = 0;

  for (const p of products) {
    const url = p.imageUrl || '';
    const isBad = BAD_PATTERNS.some(pat => url.toLowerCase().includes(pat));
    if (isBad) {
      console.log(`⚠️ Bad Image URL found for "${p.name}" (ID: ${p.id}): ${url}`);
      
      // Reset imageUrl to "" in products
      await updateDoc(doc(db, "products", p.id), {
        imageUrl: ""
      });
      console.log(`   Reset products/${p.id} imageUrl to ""`);

      // Reset in globalCatalog
      let globalId = p.globalCatalogId;
      if (!globalId) {
        const globalQuery = query(collection(db, "globalCatalog"), where("name", "==", p.name));
        const globalSnap = await getDocs(globalQuery);
        if (!globalSnap.empty) {
          globalId = globalSnap.docs[0].id;
        }
      }

      if (globalId) {
        await updateDoc(doc(db, "globalCatalog", globalId), {
          imageUrl: ""
        });
        console.log(`   Reset globalCatalog/${globalId} imageUrl to ""`);
      }
      resetCount++;
    }
  }

  console.log(`Finished. Reset ${resetCount} products.`);
  process.exit(0);
}

main().catch(console.error);
