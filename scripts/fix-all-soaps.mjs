import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, writeBatch } from "firebase/firestore";

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

const soapKeywords = [
  'soap', 'साबुन', 'dettol soap', 'cinthol', 'lux', 'lifebuoy soap', 'savlon soap', 'pears', 'dove soap',
  'rin bar', 'rin detergent bar', 'nirma beauty soap', 'nirma detergent bar', 'vivel', 'liril',
  'medimix', 'godrej no.1', 'godrej no 1', 'patanjali neem kanti', 'nima sandal',
  'nima rose', 'wheel detergent bar', 'nip bar', 'nip soap', 'mahabar', 'vim bar', 'exo bar',
  'santoor soap', 'fiama soap', 'margo', 'hamam', 'rexona', 'mysore sandal', 'chandrika'
];

function isSoapProduct(p) {
  const name = (p.name || '').toLowerCase();
  const localName = (p.localName || '').toLowerCase();
  const cat = (p.category || '').toLowerCase();
  const text = `${name} ${localName} ${cat}`;

  // Exclude liquids/handwash/cleaners/shampoo/oils/creams/etc.
  if (
    text.includes('handwash') || text.includes('hand wash') ||
    text.includes('liquid') || text.includes('shampoo') ||
    text.includes('sanitizer') || text.includes('floor cleaner') ||
    text.includes('surface cleaner') || text.includes('hair color') ||
    text.includes('baby cream') || text.includes('lal tail') ||
    text.includes('vicks') || text.includes('antiseptic') ||
    text.includes('powder') // keep detergent powders separate from bar soaps
  ) {
    return false;
  }

  if (cat === 'soaps' || cat === 'साबुन') return true;
  return soapKeywords.some(k => text.includes(k));
}

function parseWeight(name) {
  if (!name) return null;
  const match = name.match(/(\d+(?:\.\d+)?)\s*(g|gm|grams?|kg)\b/i);
  if (!match) return null;
  const val = parseFloat(match[1]);
  const u = match[2].toLowerCase();
  if (u === 'kg') return { weight: val * 1000, unit: 'g' };
  return { weight: val, unit: 'g' };
}

function parseBundleCount(name, variant) {
  const text = `${name || ''} ${variant || ''}`;
  const match = text.match(/(\d+)\s*(?:bars?|pcs?|pieces?|pack)\b/i);
  if (match) return parseInt(match[1], 10);
  return null;
}

async function run() {
  console.log("=== FIXING ALL SOAPS IN DATABASE ===\n");

  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no writes)' : 'LIVE MIGRATION'}\n`);

  // 1. Process products collection
  const prodSnap = await getDocs(collection(db, "products"));
  console.log(`Total products in db: ${prodSnap.size}`);

  let prodUpdated = 0;
  let prodBatch = writeBatch(db);
  let batchCount = 0;

  for (const d of prodSnap.docs) {
    const p = d.data();
    if (!isSoapProduct(p)) continue;

    const wInfo = parseWeight(p.name);
    const bundleCount = parseBundleCount(p.name, p.variant);
    const updates = {};
    let needsUpdate = false;

    // Soaps should be stored as packet / piece, NEVER 'g' or 'kg'
    if (p.baseUnit === 'g' || p.baseUnit === 'kg' || !p.baseUnit) {
      updates.baseUnit = 'pkt';
      needsUpdate = true;
    }

    // Soaps baseQuantity must be 1 (price is per pack / bar)
    if (p.baseQuantity !== 1) {
      updates.baseQuantity = 1;
      needsUpdate = true;
    }

    // Packet weight (e.g. 75g, 100g, 125g)
    if (wInfo) {
      if (p.packetWeight !== wInfo.weight || p.packetUnit !== wInfo.unit) {
        updates.packetWeight = wInfo.weight;
        updates.packetUnit = wInfo.unit;
        needsUpdate = true;
      }
    }

    // Bundle count if applicable
    if (bundleCount && p.bundleCount !== bundleCount) {
      updates.bundleCount = bundleCount;
      needsUpdate = true;
    }

    // Category fix (e.g. Godrej coconut soap was in Dairy & Milk Products)
    if (p.category === 'Dairy & Milk Products') {
      updates.category = 'Personal Care';
      needsUpdate = true;
    }

    if (needsUpdate) {
      prodUpdated++;
      console.log(`[products] "${p.name}" (ID: ${d.id})`);
      console.log(`  BEFORE: baseUnit: ${p.baseUnit}, baseQty: ${p.baseQuantity}, pw: ${p.packetWeight}${p.packetUnit || ''}, cat: ${p.category}`);
      console.log(`  AFTER :`, { ...p, ...updates });

      if (!isDryRun) {
        prodBatch.update(d.ref, updates);
        batchCount++;
        if (batchCount >= 400) {
          await prodBatch.commit();
          prodBatch = writeBatch(db);
          batchCount = 0;
        }
      }
    }
  }

  if (!isDryRun && batchCount > 0) {
    await prodBatch.commit();
  }
  console.log(`\n✅ Products collection done. Updated ${prodUpdated} soap items.`);

  // 2. Process globalCatalog collection
  const catSnap = await getDocs(collection(db, "globalCatalog"));
  console.log(`\nTotal items in globalCatalog: ${catSnap.size}`);

  let catUpdated = 0;
  let catBatch = writeBatch(db);
  batchCount = 0;

  for (const d of catSnap.docs) {
    const p = d.data();
    if (!isSoapProduct(p)) continue;

    const wInfo = parseWeight(p.name);
    const bundleCount = parseBundleCount(p.name, p.variant);
    const updates = {};
    let needsUpdate = false;

    if (p.baseUnit === 'g' || p.baseUnit === 'kg' || !p.baseUnit) {
      updates.baseUnit = 'pkt';
      needsUpdate = true;
    }

    if (p.baseQuantity !== 1) {
      updates.baseQuantity = 1;
      needsUpdate = true;
    }

    if (wInfo) {
      if (p.packetWeight !== wInfo.weight || p.packetUnit !== wInfo.unit) {
        updates.packetWeight = wInfo.weight;
        updates.packetUnit = wInfo.unit;
        needsUpdate = true;
      }
    }

    if (bundleCount && p.bundleCount !== bundleCount) {
      updates.bundleCount = bundleCount;
      needsUpdate = true;
    }

    if (p.category === 'Dairy & Milk Products') {
      updates.category = 'Personal Care';
      needsUpdate = true;
    }

    if (needsUpdate) {
      catUpdated++;
      console.log(`[globalCatalog] "${p.name}" (ID: ${d.id})`);
      console.log(`  BEFORE: baseUnit: ${p.baseUnit}, baseQty: ${p.baseQuantity}, pw: ${p.packetWeight}${p.packetUnit || ''}`);
      console.log(`  AFTER :`, { ...p, ...updates });

      if (!isDryRun) {
        catBatch.update(d.ref, updates);
        batchCount++;
        if (batchCount >= 400) {
          await catBatch.commit();
          catBatch = writeBatch(db);
          batchCount = 0;
        }
      }
    }
  }

  if (!isDryRun && batchCount > 0) {
    await catBatch.commit();
  }
  console.log(`\n✅ globalCatalog collection done. Updated ${catUpdated} soap items.`);

  process.exit(0);
}

run().catch(console.error);
