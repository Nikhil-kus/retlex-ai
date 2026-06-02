import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

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

function classifyProduct(name, currentCategory) {
  const n = (name || "").toLowerCase().trim();
  const c = (currentCategory || "").toLowerCase().trim();
  
  if ((n.includes("poha") && !n.includes("mixture") && !n.includes("mix"))) {
    return "Grains & Cereals";
  }
  if (n.includes("namkeen") || n.includes("mixture")) {
    return "Biscuits & Snacks";
  }
  return "Other";
}

async function check() {
  const querySnapshot = await getDocs(collection(db, "products"));
  querySnapshot.forEach(d => {
    const data = d.data();
    if (data.shopId === shopId && data.name.includes("Poha Mixture")) {
      console.log(`Doc: ${d.id} | Name: "${data.name}" | Category: "${data.category}" | Classify result: "${classifyProduct(data.name, data.category)}"`);
    }
  });
  process.exit(0);
}

check().catch(console.error);
