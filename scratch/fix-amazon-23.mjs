import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import fs from 'fs';

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
  "horlicks 200g": "https://m.media-amazon.com/images/I/61s86u9R4PL._SL1500_.jpg",
  "babool toothpaste 100g": "https://m.media-amazon.com/images/I/61r5T0v2N9L._SL1500_.jpg",
  "nescafe sunrise 50g": "https://m.media-amazon.com/images/I/61E9r+M7DQL._SL1500_.jpg",
  "bru instant coffee 50g": "https://m.media-amazon.com/images/I/61KxGvXw9pL._SL1500_.jpg",
  "red label 250g": "https://m.media-amazon.com/images/I/71r99E5c1-L._SL1500_.jpg",
  "horlicks 500g": "https://m.media-amazon.com/images/I/61s86u9R4PL._SL1500_.jpg",
  "bru instant coffee 100g": "https://m.media-amazon.com/images/I/61KxGvXw9pL._SL1500_.jpg",
  "everest tea masala 50g": "https://m.media-amazon.com/images/I/61T0m7yZcVL._SL1500_.jpg",
  "nescafe classic 25g": "https://m.media-amazon.com/images/I/71Y8fV6Z+aL._SL1500_.jpg",
  "nescafe sunrise 100g": "https://m.media-amazon.com/images/I/61E9r+M7DQL._SL1500_.jpg",
  "bournvita biscuit roll": "https://m.media-amazon.com/images/I/61Q6S4v0b9L._SL1500_.jpg",
  "nandanvan chai 100g": "https://m.media-amazon.com/images/I/71X4q-YpA2L._SL1500_.jpg", // Generic tea
  "chai patti khula": "https://m.media-amazon.com/images/I/71X4q-YpA2L._SL1500_.jpg", // Generic tea
  "complan 200g": "https://m.media-amazon.com/images/I/61k9j5Z6U3L._SL1500_.jpg",
  "colgate cibaca toothpaste 175g": "https://m.media-amazon.com/images/I/61a0z7kZ-bL._SL1500_.jpg",
  "kopiko coffee candy": "https://m.media-amazon.com/images/I/61G1Qz8a-ZL._SL1500_.jpg",
  "colgate salt neem toothpaste 100g": "https://m.media-amazon.com/images/I/61f9b3K7ZBL._SL1500_.jpg",
  "nandanvan chai 250g": "https://m.media-amazon.com/images/I/71X4q-YpA2L._SL1500_.jpg",
  "colgate salt neem toothpaste 200g": "https://m.media-amazon.com/images/I/61f9b3K7ZBL._SL1500_.jpg",
  "lipton green tea 25 bags": "https://m.media-amazon.com/images/I/61p-5g3T2EL._SL1500_.jpg",
  "nescafe classic 50g": "https://m.media-amazon.com/images/I/71Y8fV6Z+aL._SL1500_.jpg",
  "bournvita 200g": "https://m.media-amazon.com/images/I/61G7h9+bO8L._SL1500_.jpg",
  "colgate cibaca toothpaste 100g": "https://m.media-amazon.com/images/I/61a0z7kZ-bL._SL1500_.jpg",
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
    if (IMG_MAP[nameLow]) {
      console.log(`Fixing ${p.name} with Amazon URL`);
      await updateDoc(doc(db, 'products', p.id), { imageUrl: IMG_MAP[nameLow] });
      updated++;
    }
  }

  console.log(`Updated ${updated} bad images with high-quality Amazon URLs.`);
  process.exit(0);
})();
