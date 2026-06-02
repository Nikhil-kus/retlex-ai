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

  const withAliases = products.filter(p => p.localAliases && Array.isArray(p.localAliases) && p.localAliases.length > 0);
  const withoutAliases = products.filter(p => !p.localAliases || !Array.isArray(p.localAliases) || p.localAliases.length === 0);

  console.log(`Total Products in Shop: ${products.length}`);
  console.log(`Products WITH localAliases: ${withAliases.length}`);
  console.log(`Products WITHOUT localAliases: ${withoutAliases.length}`);

  if (withoutAliases.length > 0) {
    console.log('\nSample products without aliases:');
    withoutAliases.slice(0, 15).forEach(p => {
      console.log(`- "${p.name}" | localName: "${p.localName || ''}" | category: "${p.category || ''}"`);
    });
  }

  if (withAliases.length > 0) {
    console.log('\nSample products with aliases:');
    withAliases.slice(0, 10).forEach(p => {
      console.log(`- "${p.name}" -> ${JSON.stringify(p.localAliases)}`);
    });
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
