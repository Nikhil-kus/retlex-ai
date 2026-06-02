import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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
  const shopId = 'Yvgf5Us3pdNGHa0ljBGr'; // Shri Krishna Kirana
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const targets = products.filter(p => {
    const n = p.name.toLowerCase();
    return n.includes('atta') || n.includes('aata') || n.includes('tea') || n.includes('sabudana') || n.includes('khula') || n.includes('packet');
  });

  console.log(`Matching Products: ${targets.length}`);
  console.log('----------------------------------------------------');
  targets.forEach(p => {
    console.log(`Name: "${p.name}" (${p.id})`);
    console.log(`  baseUnit: ${p.baseUnit} | baseQuantity: ${p.baseQuantity} | packetWeight: ${p.packetWeight} | packetUnit: ${p.packetUnit}`);
    console.log(`  price: ${p.price}`);
  });
  
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
