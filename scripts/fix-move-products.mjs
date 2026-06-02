/**
 * 1. Lists all shops so we can find the correct one
 * 2. Moves the 10 wrongly-added products to "Shri Krishna Kirana and General Store"
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

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
  // List all shops
  console.log('📋 All shops in Firestore:');
  const shopsSnap = await getDocs(collection(db, 'shops'));
  const shops = shopsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  shops.forEach(s => console.log(`  • "${s.name}" — ID: ${s.id}  (created: ${s.createdAt || 'unknown'})`));

  // Find Shri Krishna shop
  const target = shops.find(s =>
    s.name && s.name.toLowerCase().includes('krishna')
  );

  if (!target) {
    console.error('\n❌ Could not find "Shri Krishna" shop. Check the names above and update the script.');
    process.exit(1);
  }

  console.log(`\n✅ Target shop: "${target.name}" (ID: ${target.id})`);

  // The wrong shop ID products were added to
  const wrongShopId = 'XR2LXTHTk61aYHLC61k8';

  // Find all products in the wrong shop
  const prodSnap = await getDocs(query(collection(db, 'products'), where('shopId', '==', wrongShopId)));
  console.log(`\n🔄 Moving ${prodSnap.docs.length} products from "New Shop" → "${target.name}"...`);

  for (const d of prodSnap.docs) {
    await updateDoc(doc(db, 'products', d.id), { shopId: target.id });
    console.log(`  ✅ ${d.data().name}`);
  }

  console.log('\n🎉 All products moved successfully.');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
