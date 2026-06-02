import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
  storageBucket: "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId: "1:339712048398:web:578ac498b0c942db7aab5f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const shopId = 'Yvgf5Us3pdNGHa0ljBGr';
  const snap = await getDocs(collection(db, "products"));
  console.log("Total shop products items:", snap.size);
  let found = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (data.shopId === shopId && (
      (data.name && data.name.toLowerCase().includes("lux")) ||
      (data.localName && data.localName.includes("लक्स")) ||
      (data.localAliases && data.localAliases.some(a => a.includes("लक्स") || a.toLowerCase().includes("lux")))
    )) {
      found++;
      console.log(`FOUND ID: ${d.id} | Name: ${data.name} | LocalName: ${data.localName} | localAliases: ${JSON.stringify(data.localAliases)}`);
    }
  }
  console.log(`Total matching items found: ${found}`);
  process.exit(0);
}

main().catch(console.error);
