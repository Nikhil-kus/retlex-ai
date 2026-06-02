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

const shopId = "Yvgf5Us3pdNGHa0ljBGr";

async function test() {
  const querySnapshot = await getDocs(collection(db, "products"));
  const products = [];
  querySnapshot.forEach(d => {
    if (d.data().shopId === shopId) {
      products.push({ id: d.id, ...d.data() });
    }
  });

  console.log("=== POHA PRODUCTS ===");
  const poha = products.filter(p => p.name.toLowerCase().includes("poha"));
  poha.forEach(p => {
    console.log(`ID: ${p.id} | Name: "${p.name}" | LocalName: "${p.localName}" | Category: "${p.category}" | Price: ${p.price}`);
  });

  console.log("\n=== NAMKEEN PRODUCTS ===");
  const namkeen = products.filter(p => p.name.toLowerCase().includes("namkeen") || p.name.toLowerCase().includes("mixture") || p.name.toLowerCase().includes("mix"));
  namkeen.forEach(p => {
    if (p.name.includes("A-1") || p.name.includes("A1") || p.name.toLowerCase().includes("poha")) {
      console.log(`ID: ${p.id} | Name: "${p.name}" | LocalName: "${p.localName}" | Category: "${p.category}" | Price: ${p.price}`);
    }
  });

  process.exit(0);
}

test().catch(console.error);
