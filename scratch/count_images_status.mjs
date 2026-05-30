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
const SHOP_ID = "Yvgf5Us3pdNGHa0ljBGr";

async function main() {
  const snap = await getDocs(query(collection(db, "products"), where("shopId", "==", SHOP_ID)));
  const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const wrongImagePatterns = [
    'tse1.mm.bing.net/th?q=',
    'slideserve.com',
    'pxfuel.com',
    '5startoolboxstore.com',
    'freepik.com',
    'researchgate.net',
    'wallpaper',
    'img.mandarake.co.jp',
    'pic2.zhimg.com',
    'beamimagination.com',
    'awesomestuff365.com',
    'shozemi.com',
    'cdn.amebaowndme.com',
    's.yimg.com',
    'zenfs.com',
    'eporner',
    'porn',
    'lovepik',
    'wordstemplates',
    'alamy',
    'watermark',
    'imggen',
    'medical',
    'template',
    'kuruma-news',
    'ytimg',
    'youtube'
  ];

  let totalRecentTargeted = 0;
  let refinedCount = 0;
  let remainingCount = 0;
  const remainingList = [];
  const refinedList = [];

  for (const p of products) {
    const n = p.name.toLowerCase();
    const isRecent = (
      n.includes("dettol") || n.includes("detol") ||
      n.includes("ruchi") || n.includes("krati") || n.includes("kriti") ||
      n.includes("chhola") || n.includes("moong") || n.includes("rava") ||
      n.includes("kolam") || n.includes("everest") || n.includes("jeeravan") ||
      n.includes("tan man") || n.includes("tide") || n.includes("surf excel") ||
      n.includes("ghadi") || n.includes("rin") ||
      n.includes("catch") || n.includes("pushp") ||
      n.includes("agarbatti") || n.includes("cookie") || n.includes("shringar") ||
      n.includes("basant bahar") || n.includes("d-dark") || n.includes("indulekha")
    );

    if (isRecent) {
      totalRecentTargeted++;
      const url = p.imageUrl || '';
      const isSuspicious = wrongImagePatterns.some(pat => url.includes(pat)) || url === '';
      if (isSuspicious) {
        remainingCount++;
        remainingList.push({ name: p.name, imageUrl: p.imageUrl });
      } else {
        refinedCount++;
        refinedList.push({ name: p.name, imageUrl: p.imageUrl });
      }
    }
  }

  console.log(`\n=== IMAGE REFINEMENT STATUS ===`);
  console.log(`Total targeted products: ${totalRecentTargeted}`);
  console.log(`Successfully refined: ${refinedCount}`);
  console.log(`Remaining/Failed: ${remainingCount}`);

  if (remainingList.length > 0) {
    console.log(`\n--- Remaining Products (${remainingList.length}) ---`);
    remainingList.forEach((p, i) => {
      console.log(`${i + 1}. "${p.name}" (Current URL: ${p.imageUrl || 'BLANK'})`);
    });
  }

  if (refinedList.length > 0) {
    console.log(`\n--- Refined Products (${refinedList.length}) ---`);
    refinedList.forEach((p, i) => {
      console.log(`${i + 1}. "${p.name}" -> ${p.imageUrl}`);
    });
  }

  process.exit(0);
}

main().catch(console.error);
