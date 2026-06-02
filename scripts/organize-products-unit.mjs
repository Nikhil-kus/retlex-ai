import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } from "firebase/firestore";

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

function parseWeightFromName(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  
  if (n.includes('khula') || n.includes('loose') || n.includes('खुला') || n.includes('खुली')) {
    return null;
  }

  const match = name.match(/(\d+(?:\.\d+)?)\s*(g|gm|gram|grams|kg|kilo|kilos|l|ml|liter|litre|litres|ltr)\b/i);
  if (!match) return null;

  return true; // Has weight/volume details
}

async function main() {
  console.log("Starting product unit normalization migration (pc -> pkt for packet products)...\n");

  // 1. Products
  const productsSnap = await getDocs(collection(db, "products"));
  console.log(`Total products fetched: ${productsSnap.size}`);

  let productsBatch = writeBatch(db);
  let productsCount = 0;
  let productsUpdated = 0;

  for (const d of productsSnap.docs) {
    const product = d.data();
    const hasWeight = parseWeightFromName(product.name);

    if (hasWeight) {
      // If the unit is 'pc', we normalize it to 'pkt'
      if (product.baseUnit === 'pc' || !product.baseUnit) {
        productsBatch.update(d.ref, { baseUnit: 'pkt' });
        productsCount++;
        productsUpdated++;

        console.log(`  [products] Update "${product.name}": baseUnit = pkt`);

        if (productsCount >= 400) {
          await productsBatch.commit();
          productsBatch = writeBatch(db);
          productsCount = 0;
        }
      }
    }
  }
  if (productsCount > 0) {
    await productsBatch.commit();
  }
  console.log(`\n✅ Finished updating products collection. Updated ${productsUpdated} documents.`);

  // 2. Global Catalog
  const catalogSnap = await getDocs(collection(db, "globalCatalog"));
  console.log(`\nTotal globalCatalog items fetched: ${catalogSnap.size}`);

  let catalogBatch = writeBatch(db);
  let catalogCount = 0;
  let catalogUpdated = 0;

  for (const d of catalogSnap.docs) {
    const item = d.data();
    const hasWeight = parseWeightFromName(item.name);

    if (hasWeight) {
      if (item.baseUnit === 'pc' || !item.baseUnit) {
        catalogBatch.update(d.ref, { baseUnit: 'pkt' });
        catalogCount++;
        catalogUpdated++;

        console.log(`  [globalCatalog] Update "${item.name}": baseUnit = pkt`);

        if (catalogCount >= 400) {
          await catalogBatch.commit();
          catalogBatch = writeBatch(db);
          catalogCount = 0;
        }
      }
    }
  }
  if (catalogCount > 0) {
    await catalogBatch.commit();
  }
  console.log(`\n✅ Finished updating globalCatalog. Updated ${catalogUpdated} documents.`);
  process.exit(0);
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
