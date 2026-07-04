import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk',
  authDomain: 'retlex-ai.firebaseapp.com',
  projectId: 'retlex-ai',
  storageBucket: 'retlex-ai.firebasestorage.app',
  messagingSenderId: '339712048398',
  appId: '1:339712048398:web:578ac498b0c942db7aab5f',
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

(async () => {
  const shopsSnap = await getDocs(collection(db, 'shops'));
  const shopIds = shopsSnap.docs.map(d => d.id);
  
  let updated = 0;
  
  for (const shopId of shopIds) {
    const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
    const products = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => p.category && (p.category.toLowerCase().includes("oral") || p.category.toLowerCase().includes("tea")));

    const promises = products.map(p => {
      const color = p.category.toLowerCase().includes("oral") ? "0066CC/FFFFFF" : "CC6600/FFFFFF";
      const short = encodeURIComponent(p.name.slice(0, 30));
      const url = `https://placehold.co/400x400/${color}.png?text=${short}`;
      updated++;
      return updateDoc(doc(db, 'products', p.id), { imageUrl: url });
    });
    
    await Promise.all(promises);
  }

  console.log(`Updated ${updated} items instantly.`);
  process.exit(0);
})();
