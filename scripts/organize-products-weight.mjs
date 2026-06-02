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

// Helper to parse weight/volume from name
function parseWeightFromName(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  
  // Check if it's a loose product
  if (n.includes('khula') || n.includes('loose') || n.includes('खुला') || n.includes('खुली')) {
    return null; // Loose products are sold by weight directly, not by packet
  }

  // Regex to match numbers followed by units (g, gm, kg, l, ml, etc.)
  const match = name.match(/(\d+(?:\.\d+)?)\s*(g|gm|gram|grams|kg|kilo|kilos|l|ml|liter|litre|litres|ltr)\b/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  let weightGrams = value;
  let packetUnit = "g";

  if (['kg', 'kilo', 'kilos'].includes(unit)) {
    weightGrams = value * 1000;
    packetUnit = "g";
  } else if (['l', 'liter', 'litre', 'litres', 'ltr'].includes(unit)) {
    weightGrams = value * 1000;
    packetUnit = "ml";
  } else if (['ml', 'mili'].includes(unit)) {
    weightGrams = value;
    packetUnit = "ml";
  } else {
    weightGrams = value;
    packetUnit = "g";
  }

  return { weightGrams, packetUnit };
}

async function main() {
  console.log("Starting weight-specific product organization migration...\n");

  // 1. Fetch all products from products collection
  const productsSnap = await getDocs(collection(db, "products"));
  console.log(`Total products fetched: ${productsSnap.size}`);

  let productsBatch = writeBatch(db);
  let productsCount = 0;
  let productsUpdated = 0;

  for (const d of productsSnap.docs) {
    const product = d.data();
    const weightInfo = parseWeightFromName(product.name);

    if (weightInfo) {
      const { weightGrams, packetUnit } = weightInfo;

      // Update fields if they are missing or different
      if (
        product.baseQuantity !== weightGrams ||
        product.packetWeight !== weightGrams ||
        product.packetUnit !== packetUnit ||
        !['pc', 'pkt'].includes(product.baseUnit)
      ) {
        const updateData = {
          baseQuantity: weightGrams,
          packetWeight: weightGrams,
          packetUnit: packetUnit,
          baseUnit: product.baseUnit && ['pc', 'pkt'].includes(product.baseUnit) ? product.baseUnit : 'pc'
        };

        productsBatch.update(d.ref, updateData);
        productsCount++;
        productsUpdated++;

        console.log(`  [products] Update "${product.name}": baseQuantity/packetWeight = ${weightGrams}, packetUnit = ${packetUnit}`);

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

  // 2. Fetch all products from globalCatalog collection and do the same
  const catalogSnap = await getDocs(collection(db, "globalCatalog"));
  console.log(`\nTotal globalCatalog items fetched: ${catalogSnap.size}`);

  let catalogBatch = writeBatch(db);
  let catalogCount = 0;
  let catalogUpdated = 0;

  for (const d of catalogSnap.docs) {
    const item = d.data();
    const weightInfo = parseWeightFromName(item.name);

    if (weightInfo) {
      const { weightGrams, packetUnit } = weightInfo;

      if (
        item.baseQuantity !== weightGrams ||
        item.packetWeight !== weightGrams ||
        item.packetUnit !== packetUnit ||
        !['pc', 'pkt'].includes(item.baseUnit)
      ) {
        const updateData = {
          baseQuantity: weightGrams,
          packetWeight: weightGrams,
          packetUnit: packetUnit,
          baseUnit: item.baseUnit && ['pc', 'pkt'].includes(item.baseUnit) ? item.baseUnit : 'pc'
        };

        catalogBatch.update(d.ref, updateData);
        catalogCount++;
        catalogUpdated++;

        console.log(`  [globalCatalog] Update "${item.name}": baseQuantity/packetWeight = ${weightGrams}, packetUnit = ${packetUnit}`);

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
