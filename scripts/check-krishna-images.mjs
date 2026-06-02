import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
  storageBucket: "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId: "1:339712048398:web:578ac498b0c942db7aab5f",
});
const db = getFirestore(app);

const shopsSnap = await getDocs(collection(db, "shops"));
let shopId = null;
for (const d of shopsSnap.docs) {
  if ((d.data().name || "").toLowerCase().includes("krishna")) { shopId = d.id; break; }
}

const snap = await getDocs(query(collection(db, "products"), where("shopId", "==", shopId)));
const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
const withImg = all.filter(p => p.imageUrl && p.imageUrl.startsWith("http"));
const without = all.filter(p => !p.imageUrl || !p.imageUrl.startsWith("http"));

console.log("Total products :", all.length);
console.log("With image     :", withImg.length);
console.log("Without image  :", without.length);
console.log("\nProducts WITH images:");
withImg.forEach(p => console.log("  [OK] " + p.name + "\n       " + p.imageUrl.slice(0,80)));
process.exit(0);
