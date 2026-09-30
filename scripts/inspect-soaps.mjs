import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function main() {
  const shopsSnap = await getDocs(collection(db, "shops"));
  const shops = {};
  shopsSnap.forEach(s => { shops[s.id] = s.data().name; });

  const prodSnap = await getDocs(collection(db, "products"));
  const catSnap = await getDocs(collection(db, "globalCatalog"));

  console.log("Total products in db:", prodSnap.size);

  const soapKeywords = [
    'soap', 'साबुन', 'dettol', 'cinthol', 'lux', 'lifebuoy', 'savlon', 'pears', 'dove',
    'rin bar', 'rin detergent', 'nirma beauty', 'nirma detergent', 'vivel', 'liril',
    'medimix', 'godrej no.1', 'godrej no 1', 'patanjali neem kanti', 'nima sandal',
    'nima rose', 'wheel detergent bar', 'nip bar', 'nip soap', 'mahabar', 'vim bar', 'exo bar',
    'santoor', 'fiama', 'margo', 'hamam', 'rexona', 'mysore sandal', 'chandrika'
  ];

  const isSoap = (p) => {
    const text = `${p.name || ''} ${p.localName || ''} ${p.category || ''}`.toLowerCase();
    return soapKeywords.some(k => text.includes(k));
  };

  const prods = [];
  prodSnap.forEach(d => {
    const data = d.data();
    if (isSoap(data)) {
      prods.push({ id: d.id, ...data });
    }
  });

  console.log(`Found ${prods.length} soap products in products collection.`);

  const byShop = {};
  prods.forEach(p => {
    const sName = shops[p.shopId] || p.shopId;
    byShop[sName] = byShop[sName] || [];
    byShop[sName].push(p);
  });

  for (const [shopName, items] of Object.entries(byShop)) {
    console.log(`\n========================================`);
    console.log(`Shop: ${shopName} (${items.length} items)`);
    console.log(`========================================`);
    items.forEach(item => {
      console.log(`- [${item.id}] "${item.name}" | "${item.localName || ''}" | Cat: ${item.category} | Price: ₹${item.price} | baseUnit: ${item.baseUnit} | baseQty: ${item.baseQuantity} | pw: ${item.packetWeight}${item.packetUnit || ''}`);
    });
  }

  process.exit(0);
}

main().catch(console.error);
