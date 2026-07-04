import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import Fuse from 'fuse.js';

const firebaseConfig = {
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
  storageBucket: "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId: "1:339712048398:web:578ac498b0c942db7aab5f",
  measurementId: "G-J2Y7R4XMMN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const shopId = "PyecarRrYeP4Nx2VqZLd";
  const q = query(collection(db, "products"), where("shopId", "==", shopId));
  const snap = await getDocs(q);
  const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(`Loaded ${products.length} products for shop ${shopId}.`);

  const fuse = new Fuse(products, {
    keys: ['name', 'localName', 'localAliases'],
    threshold: 0.6,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2
  });

  const searchNames = ["चावल", "पोहा"];
  
  searchNames.forEach(queryName => {
    console.log(`\n================= SEARCHING FOR: "${queryName}" =================`);
    const results = fuse.search(queryName);
    console.log(`Top 10 Fuse.js Results:`);
    results.slice(0, 10).forEach((r, idx) => {
      console.log(`  ${idx + 1}. [ID: ${r.item.id}] Name: ${r.item.name} | Local: ${r.item.localName} | Aliases: ${JSON.stringify(r.item.localAliases)} | Score: ${r.score.toFixed(4)} | Unit: ${r.item.baseUnit} | Weight: ${r.item.packetWeight}`);
    });
  });

  process.exit(0);
}
run();
