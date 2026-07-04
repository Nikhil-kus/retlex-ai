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

const IMG_MAP = {
  "goodricke strong": "https://m.media-amazon.com/images/I/71r99E5c1-L._SL1500_.jpg",
  "goodricke chai": "https://m.media-amazon.com/images/I/71r99E5c1-L._SL1500_.jpg",
  "okhle garlic ginger paste": "https://m.media-amazon.com/images/I/71F1a2a4b8L._SL1500_.jpg",
  "lamsa export quality tea": "https://m.media-amazon.com/images/I/71r99E5c1-L._SL1500_.jpg",
  "nescafe sunrise extra coffee": "https://m.media-amazon.com/images/I/61E9r+M7DQL._SL1500_.jpg",
  "vicco vajradanti toothpaste": "https://m.media-amazon.com/images/I/61r5T0v2N9L._SL1500_.jpg",
  "nandanvan classic strong tea liquor": "https://m.media-amazon.com/images/I/71r99E5c1-L._SL1500_.jpg",
  "britannia toastea rusk single pack": "https://m.media-amazon.com/images/I/61P9o6X7t4L._SL1500_.jpg"
};

(async () => {
  const shopId = 'Yvgf5Us3pdNGHa0ljBGr';
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.category && (p.category.toLowerCase().includes("oral") || p.category.toLowerCase().includes("tea")));

  let updated = 0;
  for (const p of products) {
    const nameLow = p.name.toLowerCase().trim();
    
    // Check if it's one of the known broken ones
    let matchedImg = null;
    for (const [key, val] of Object.entries(IMG_MAP)) {
      if (nameLow.includes(key)) {
        matchedImg = val;
        break;
      }
    }
    
    if (matchedImg) {
      console.log(`Fixing ${p.name} with Amazon URL`);
      await updateDoc(doc(db, 'products', p.id), { imageUrl: matchedImg });
      updated++;
    }
  }

  console.log(`Updated ${updated} bad images with high-quality Amazon URLs.`);
  process.exit(0);
})();
