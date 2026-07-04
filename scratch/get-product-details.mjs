import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

  const targets = ["Fortune Oil 1L", "Ghadi Detergent Powder 500g"];
  const matches = products.filter(p => targets.some(t => (p.name || '').toLowerCase() === t.toLowerCase()));

  console.log(`Found ${matches.length} matching products:`);
  matches.forEach(p => {
    console.log(`\nProduct Name: ${p.name} (ID: ${p.id})`);
    console.log(JSON.stringify(p, null, 2));
  });

  process.exit(0);
}
run();
