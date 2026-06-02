import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
  storageBucket: "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId: "1:339712048398:web:578ac498b0c942db7aab5f",
  measurementId: "G-J2Y7R4XMMN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const shopIds = ["PyecarRrYeP4Nx2VqZLd", "Yvgf5Us3pdNGHa0ljBGr"];

async function analyze() {
  for (const shopId of shopIds) {
    console.log(`\n======================================`);
    console.log(`ANALYZING SHOP ID: ${shopId}`);
    console.log(`======================================`);
    
    const q = query(collection(db, "products"), where("shopId", "==", shopId));
    const querySnapshot = await getDocs(q);
    
    console.log(`Total Products: ${querySnapshot.size}`);
    
    const categories = new Set();
    const uncategorized = [];
    const categoryCounts = {};
    const missingImages = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const category = data.category || "None";
      categories.add(category);
      
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      
      if (!data.imageUrl) {
        missingImages.push(data.name);
      }
    });
    
    console.log("Categories found:", Array.from(categories));
    console.log("Category counts:", categoryCounts);
    console.log(`Products missing images: ${missingImages.length}`);
    if (missingImages.length > 0) {
      console.log("First 10 missing images:", missingImages.slice(0, 10));
    }
  }
  process.exit(0);
}

analyze().catch(err => {
  console.error(err);
  process.exit(1);
});
