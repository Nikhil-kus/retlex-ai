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
  const shopId = 'Yvgf5Us3pdNGHa0ljBGr';
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const domains = {};
  products.forEach(p => {
    if (p.imageUrl) {
      try {
        const url = new URL(p.imageUrl);
        domains[url.hostname] = (domains[url.hostname] || 0) + 1;
      } catch {}
    }
  });

  console.log('Image Domains:');
  Object.entries(domains).sort((a, b) => b[1] - a[1]).forEach(([d, count]) => {
    console.log(`${d}: ${count}`);
  });

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
