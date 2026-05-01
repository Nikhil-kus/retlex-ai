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

async function analyzeProducts() {
  try {
    // Get all shops first
    const shopsSnapshot = await getDocs(collection(db, "shops"));
    
    if (shopsSnapshot.empty) {
      console.log("No shops found");
      return;
    }

    for (const shopDoc of shopsSnapshot.docs) {
      const shopId = shopDoc.id;
      const shopName = shopDoc.data().name || "Unknown Shop";
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`SHOP: ${shopName} (ID: ${shopId})`);
      console.log(`${'='.repeat(80)}\n`);

      // Get all products for this shop
      const q = query(collection(db, "products"), where("shopId", "==", shopId));
      const productsSnapshot = await getDocs(q);
      
      if (productsSnapshot.empty) {
        console.log("No products found for this shop\n");
        continue;
      }

      const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Group by category
      const groupedByCategory = {};
      products.forEach(product => {
        const category = product.category || "Uncategorized";
        if (!groupedByCategory[category]) {
          groupedByCategory[category] = [];
        }
        groupedByCategory[category].push(product);
      });

      // Display analysis
      console.log(`Total Products: ${products.length}\n`);
      console.log(`Categories Found: ${Object.keys(groupedByCategory).length}\n`);

      const categories = Object.keys(groupedByCategory).sort();
      
      categories.forEach(category => {
        const categoryProducts = groupedByCategory[category];
        console.log(`\n📦 ${category} (${categoryProducts.length} products)`);
        console.log(`${'─'.repeat(70)}`);
        
        categoryProducts.forEach(product => {
          const imageStatus = product.imageUrl ? "✓ Has Image" : "✗ No Image";
          console.log(`  • ${product.name}`);
          if (product.localName) console.log(`    └─ Local: ${product.localName}`);
          console.log(`    └─ Price: ₹${product.price || 0} | Unit: ${product.baseUnit} | ${imageStatus}`);
        });
      });

      // Summary statistics
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`SUMMARY STATISTICS:`);
      console.log(`${'─'.repeat(70)}`);
      
      const productsWithImages = products.filter(p => p.imageUrl).length;
      const productsWithoutImages = products.length - productsWithImages;
      const avgPrice = (products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length).toFixed(2);
      
      console.log(`Products with Images: ${productsWithImages} (${((productsWithImages/products.length)*100).toFixed(1)}%)`);
      console.log(`Products without Images: ${productsWithoutImages} (${((productsWithoutImages/products.length)*100).toFixed(1)}%)`);
      console.log(`Average Price: ₹${avgPrice}`);
      
      // Category distribution
      console.log(`\nCategory Distribution:`);
      categories.forEach(category => {
        const count = groupedByCategory[category].length;
        const percentage = ((count / products.length) * 100).toFixed(1);
        const bar = '█'.repeat(Math.round(count / 2));
        console.log(`  ${category.padEnd(20)} ${bar} ${count} (${percentage}%)`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

analyzeProducts();
