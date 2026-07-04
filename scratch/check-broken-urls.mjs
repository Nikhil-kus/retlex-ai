import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import http from 'http';
import https from 'https';

const app = initializeApp({
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
  storageBucket: "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId: "1:339712048398:web:578ac498b0c942db7aab5f",
});
const db = getFirestore(app);

function checkUrl(url) {
  return new Promise((resolve) => {
    if (!url || !url.startsWith("http")) return resolve(false);
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { timeout: 3000 }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

async function main() {
  const shopId = "Yvgf5Us3pdNGHa0ljBGr";
  
  const snap = await getDocs(query(collection(db, "products"), where("shopId", "==", shopId)));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const items = all.filter(p => p.category && (p.category.toLowerCase().includes("oral") || p.category.toLowerCase().includes("tea")));
  
  const broken = [];
  
  for (const p of items) {
    const isOk = await checkUrl(p.imageUrl);
    if (!isOk) {
      broken.push(p);
    }
  }

  console.log(`Found ${broken.length} broken images in Oral Care & Tea & Coffee.`);
  broken.forEach(p => {
    console.log(`- ${p.name} | URL: ${p.imageUrl}`);
  });
  process.exit(0);
}
main();
