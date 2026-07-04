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
  const shopsSnap = await getDocs(collection(db, "shops"));
  const shops = shopsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  const productsSnap = await getDocs(collection(db, "products"));
  const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  console.log("=== ALL SHOPS IN DATABASE ===");
  shops.forEach(shop => {
    const shopProducts = products.filter(p => p.shopId === shop.id);
    console.log(`- Shop Name: ${shop.name} | ID: ${shop.id} | Product Count: ${shopProducts.length}`);
  });

  process.exit(0);
}
run();
