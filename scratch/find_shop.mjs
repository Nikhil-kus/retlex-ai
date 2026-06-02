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

async function main() {
  const shopsSnap = await getDocs(collection(db, 'shops'));
  const shops = shopsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const target = shops.find(s => s.name?.toLowerCase().includes('shri krishna'));
  if (target) {
    console.log(`FOUND_SHOP_ID=${target.id}`);
    console.log(`FOUND_SHOP_NAME=${target.name}`);
  } else {
    console.log("Shop not found. Available shops:");
    shops.forEach(s => console.log(`- ${s.name} (${s.id})`));
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
