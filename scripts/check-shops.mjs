import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
  storageBucket: "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId: "1:339712048398:web:578ac498b0c942db7aab5f",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

async function countProducts(shopId) {
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
  return snap.docs.map(d => d.data().name);
}

async function main() {
  const shopsSnap = await getDocs(collection(db, 'shops'));
  const shops = shopsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  for (const s of shops) {
    const names = await countProducts(s.id);
    console.log(`\n"${s.name}" (${s.id}) — ${names.length} products`);
    names.forEach(n => console.log(`   • ${n}`));
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
