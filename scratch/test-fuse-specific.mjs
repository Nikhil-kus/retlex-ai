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
  const snap = await getDocs(collection(db, "products"));
  const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => p.shopId === "luqZCf4omNvDBYPRq7IN");

  const fuse = new Fuse(products, {
    keys: ['name', 'localName', 'localAliases'],
    threshold: 0.6,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2
  });

  const queryName = "चावल";
  const results = fuse.search(queryName);
  
  const targetId = "fCfhbHapMuvyqdf2IV4H";
  const matched = results.find(r => r.item.id === targetId);
  
  if (matched) {
    console.log(`MATCH FOUND in Fuse.js for "${queryName}":`);
    console.log(`Name: ${matched.item.name}`);
    console.log(`LocalName: ${matched.item.localName}`);
    console.log(`Aliases: ${JSON.stringify(matched.item.localAliases)}`);
    console.log(`Fuse Score: ${matched.score}`);
  } else {
    console.log(`NO MATCH FOUND in Fuse.js for "${queryName}" for product ID ${targetId}`);
  }

  process.exit(0);
}
run();
