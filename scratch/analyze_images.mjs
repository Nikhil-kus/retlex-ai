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
    console.log(`SHOP ID: ${shopId}`);
    console.log(`======================================`);
    
    const q = query(collection(db, "products"), where("shopId", "==", shopId));
    const querySnapshot = await getDocs(q);
    
    const imageStats = {
      empty: 0,
      validUrl: 0,
      placeholder: 0,
      openFoodFacts: 0,
      total: 0
    };
    
    const sampleByCat = {};
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const cat = data.category || "Uncategorized";
      const img = data.imageUrl || "";
      
      imageStats.total++;
      
      if (!img.trim()) {
        imageStats.empty++;
      } else if (img.includes("openfoodfacts.org") || img.includes("placeholder") || img.includes("default")) {
        imageStats.openFoodFacts++;
      } else {
        imageStats.validUrl++;
      }
      
      if (!sampleByCat[cat]) {
        sampleByCat[cat] = [];
      }
      sampleByCat[cat].push({ name: data.name, imageUrl: img });
    });
    
    console.log("Image Stats:", imageStats);
    console.log("\nSample Images by Category (first 1 per category):");
    for (const [cat, items] of Object.entries(sampleByCat)) {
      const itemWithImg = items.find(i => i.imageUrl) || items[0];
      console.log(`  - ${cat}: "${itemWithImg?.name}" -> ${itemWithImg?.imageUrl || 'None'}`);
    }
  }
  process.exit(0);
}

analyze().catch(err => {
  console.error(err);
  process.exit(1);
});
