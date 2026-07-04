import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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
  const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const targets = ["Fortune Oil 1L", "Ghadi Detergent Powder 500g", "Fortune Rice Bran Health Oil 1L"];
  const matches = products.filter(p => targets.some(t => (p.name || '').toLowerCase() === t.toLowerCase()));

  console.log(`Found ${matches.length} matching products across all shops:`);
  matches.forEach(p => {
    console.log(`- ShopID: ${p.shopId} | ID: ${p.id} | Name: ${p.name} | LocalName: ${p.localName} | Price: ${p.price} | Weight: ${p.packetWeight}`);
  });

  process.exit(0);
}
run();
