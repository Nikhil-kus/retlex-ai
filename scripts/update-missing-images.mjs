import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
  storageBucket: "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId: "1:339712048398:web:578ac498b0c942db7aab5f",
});
const db = getFirestore(app);

async function main() {
  const updates = [
    {
      id: "0yK2Jp8VQnxF71meTGNm", // Patanjali
      imageUrl: "https://www.bigbasket.com/media/uploads/p/l/40003058_13-patanjali-kesh-kanti-natural-hair-cleanser.jpg"
    },
    {
      id: "EloQwHnLTa0Rk1nIkMYb", // Tobacco
      imageUrl: "https://5.imimg.com/data5/SELLER/Default/2021/6/RD/FR/AD/6513364/kamal-pasand-tobacco-500x500.jpeg"
    }
  ];

  for (const update of updates) {
    try {
      const ref = doc(db, "products", update.id);
      await updateDoc(ref, { imageUrl: update.imageUrl });
      console.log(`Updated ${update.id} with ${update.imageUrl}`);
    } catch (e) {
      console.error(`Failed to update ${update.id}`, e);
    }
  }
  process.exit(0);
}
main();
