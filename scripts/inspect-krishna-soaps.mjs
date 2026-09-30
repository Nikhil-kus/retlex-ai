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
  const prodSnap = await getDocs(collection(db, "products"));
  const krishnaItems = [];
  prodSnap.forEach(d => {
    const data = d.data();
    if (data.shopId === "Yvgf5Us3pdNGHa0ljBGr") {
      krishnaItems.push({ id: d.id, ...data });
    }
  });

  const soaps = krishnaItems.filter(p => {
    const text = `${p.name || ''} ${p.localName || ''} ${p.category || ''}`.toLowerCase();
    return p.category === 'Soaps' || p.category === 'Personal Care' || p.category === 'Personal Care & Hygiene' || text.includes('soap') || text.includes('साबुन');
  });

  console.log(`Total soap items in Krishna shop: ${soaps.length}`);
  soaps.forEach((s, idx) => {
    console.log(`${idx + 1}. [${s.id}] name: "${s.name}" | localName: "${s.localName || ''}" | Cat: "${s.category}" | Price: ₹${s.price} | baseUnit: "${s.baseUnit}" | baseQty: ${s.baseQuantity} | pw: ${s.packetWeight} | pu: "${s.packetUnit}" | variant: "${s.variant || ''}"`);
  });

  process.exit(0);
}

main().catch(console.error);
