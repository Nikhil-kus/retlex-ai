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
  const q = query(collection(db, "products"));
  const snap = await getDocs(q);
  const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  const kajuProducts = products.filter(p => {
    const n = (p.name || '').toLowerCase();
    const l = (p.localName || '').toLowerCase();
    return n.includes("kaju") || l.includes("काजू");
  });
  
  console.log("=== KAJU PRODUCTS ===");
  kajuProducts.forEach(p => {
    console.log(`- ID: ${p.id}, Name: ${p.name}, LocalName: ${p.localName}, Aliases: ${JSON.stringify(p.localAliases)}, Unit: ${p.baseUnit}, Qty: ${p.baseQuantity}, Price: ${p.price}, Weight: ${p.packetWeight}`);
  });

  const kajalProducts = products.filter(p => {
    const n = (p.name || '').toLowerCase();
    const l = (p.localName || '').toLowerCase();
    return n.includes("kajal") || l.includes("काजल");
  });
  console.log("=== KAJAL PRODUCTS ===");
  kajalProducts.forEach(p => {
    console.log(`- ID: ${p.id}, Name: ${p.name}, LocalName: ${p.localName}, Aliases: ${JSON.stringify(p.localAliases)}, Unit: ${p.baseUnit}, Qty: ${p.baseQuantity}, Price: ${p.price}, Weight: ${p.packetWeight}`);
  });

  process.exit(0);
}
run();
