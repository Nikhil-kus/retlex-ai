import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function run() {
  const querySnapshot = await getDocs(collection(db, "products"));
  const products = [];
  querySnapshot.forEach(d => {
    if (d.data().shopId === shopId) {
      products.push({ id: d.id, ...d.data() });
    }
  });

  console.log("=== SHOP DETTOL PRODUCTS ===");
  const dettol = products.filter(p => p.name.toLowerCase().includes("dettol"));
  dettol.forEach(p => {
    console.log(`- ${p.name} (${p.price} INR) | Category: ${p.category}`);
  });

  console.log("\n=== SHOP MASALA PRODUCTS ===");
  const masalas = products.filter(p => p.category === "Spices & Masala" || p.name.toLowerCase().includes("masala") || p.name.toLowerCase().includes("powder"));
  masalas.slice(0, 40).forEach(p => {
    console.log(`- ${p.name} (${p.price} INR) | Category: ${p.category}`);
  });

  console.log("\n=== SHOP DETERGENT PRODUCTS ===");
  const detergents = products.filter(p => p.category === "Household Cleaning" && (p.name.toLowerCase().includes("detergent") || p.name.toLowerCase().includes("powder") || p.name.toLowerCase().includes("surf") || p.name.toLowerCase().includes("wheel") || p.name.toLowerCase().includes("ghadi") || p.name.toLowerCase().includes("rin") || p.name.toLowerCase().includes("tide")));
  detergents.forEach(p => {
    console.log(`- ${p.name} (${p.price} INR) | Category: ${p.category}`);
  });

  process.exit(0);
}

run().catch(console.error);
