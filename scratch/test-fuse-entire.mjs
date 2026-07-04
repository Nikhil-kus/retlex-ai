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
  const shopId = "NjGBnhsc25w4jb2q6Ol4";
  const q = query(collection(db, "products"), where("shopId", "==", shopId));
  const snap = await getDocs(q);
  const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const fuse = new Fuse(products, {
    keys: ['name', 'localName', 'localAliases'],
    threshold: 0.6,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2
  });

  const queryName = "चावल";
  const results = fuse.search(queryName);
  console.log(`=== TOP 15 FUSE RESULTS FOR "${queryName}" ===`);
  results.slice(0, 15).forEach((r, idx) => {
    console.log(`  ${idx + 1}. [ID: ${r.item.id}] Name: ${r.item.name} | Score: ${r.score.toFixed(4)}`);
  });

  const queryName2 = "पोहा";
  const results2 = fuse.search(queryName2);
  console.log(`\n=== TOP 15 FUSE RESULTS FOR "${queryName2}" ===`);
  results2.slice(0, 15).forEach((r, idx) => {
    console.log(`  ${idx + 1}. [ID: ${r.item.id}] Name: ${r.item.name} | Score: ${r.score.toFixed(4)}`);
  });

  process.exit(0);
}
run();
