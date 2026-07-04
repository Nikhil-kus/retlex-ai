import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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
  for (const doc of shopsSnap.docs) {
    const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', doc.id)));
    for (const p of snap.docs) {
      const data = p.data();
      if (data.name && data.name.toLowerCase().includes('namak')) {
        console.log("Found:", data.name);
      }
    }
  }
  process.exit(0);
})();
