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

const shopId = "Yvgf5Us3pdNGHa0ljBGr";

async function check() {
  const q = query(collection(db, "products"), where("shopId", "==", shopId), where("category", "==", "Personal Care"));
  const querySnapshot = await getDocs(q);
  console.log(`Personal Care Products for Yvgf5Us3pdNGHa0ljBGr (${querySnapshot.size}):`);
  querySnapshot.forEach(d => {
    console.log(`  - "${d.data().name}"`);
  });
  process.exit(0);
}

check().catch(console.error);
