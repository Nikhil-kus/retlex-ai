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

  const matches = products.filter(p => {
    const n = (p.name || '').toLowerCase();
    const l = (p.localName || '').toLowerCase();
    return n.includes("ghadi") || l.includes("घड़ी") || n.includes("detergent") || l.includes("डिटर्जेंट");
  });

  console.log(`Found ${matches.length} matching products:`);
  matches.forEach(p => {
    console.log(`- ID: ${p.id} | Name: ${p.name} | LocalName: ${p.localName} | Price: ${p.price}`);
  });

  process.exit(0);
}
run();
