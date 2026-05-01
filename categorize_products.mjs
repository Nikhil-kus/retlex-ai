import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";

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

// Categorization mapping based on product names
const categoryMapping = {
  // Grains & Cereals
  "Grains & Cereals": ["aata", "maida", "poha", "rice", "sabudana", "suji", "semolina"],
  
  // Pulses & Dals
  "Pulses & Dals": ["dal", "daal", "chana", "masoor", "moong", "toor", "urad", "besan", "gram flour"],
  
  // Spices & Seasonings
  "Spices & Seasonings": ["masala", "dhaniya", "haldi", "turmeric", "mirchi", "chilli", "ilaychi", "cardamom", "garam", "spice"],
  
  // Oils & Ghee
  "Oils & Ghee": ["oil", "ghee", "tel", "parachute", "mustard", "dhara", "fortune", "refined", "coconut"],
  
  // Dairy & Milk Products
  "Dairy & Milk Products": ["milk", "paneer", "curd", "dahi", "butter", "amul", "sanchi", "cheese"],
  
  // Beverages
  "Beverages": ["tea", "coffee", "chai", "bru", "nescafe", "red label", "tata tea"],
  
  // Snacks & Confectionery
  "Snacks & Confectionery": ["namkeen", "chips", "lays", "kurkure", "candy", "toffee", "chocolate", "kitkat", "dairy milk", "perk", "marie", "bourbon", "good day", "bhujia", "haldiram"],
  
  // Instant Foods & Noodles
  "Instant Foods & Noodles": ["maggi", "noodles", "yippee", "instant"],
  
  // Personal Care & Hygiene
  "Personal Care & Hygiene": ["soap", "shampoo", "toothpaste", "pepsodent", "colgate", "boroplus", "dettol", "lifebuoy", "lux", "oil", "amla", "hair"],
  
  // Household Cleaning
  "Household Cleaning": ["harpic", "phenyl", "vim", "rin", "surf", "wheel", "powder", "liquid", "cleaner", "detergent"],
  
  // Miscellaneous
  "Miscellaneous": ["agarbatti", "incense", "matchbox", "carry", "bag", "foil", "tissue", "gud", "gur", "salt", "sugar", "nariyal", "coconut", "supadi", "betel", "all out", "good night"]
};

function categorizeProduct(productName) {
  const name = (productName || "").toLowerCase().trim();
  
  for (const [category, keywords] of Object.entries(categoryMapping)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        return category;
      }
    }
  }
  
  return "Miscellaneous"; // Default category
}

async function categorizeAllProducts() {
  try {
    console.log("Starting product categorization...\n");
    
    // Get all shops
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
      
      // Categorize and update each product
      let updatedCount = 0;
      const categoryStats = {};

      for (const product of products) {
        const newCategory = categorizeProduct(product.name);
        
        // Update the product in Firebase
        const productRef = doc(db, "products", product.id);
        await updateDoc(productRef, { category: newCategory });
        
        // Track statistics
        if (!categoryStats[newCategory]) {
          categoryStats[newCategory] = 0;
        }
        categoryStats[newCategory]++;
        updatedCount++;
        
        console.log(`✓ ${product.name.padEnd(30)} → ${newCategory}`);
      }

      // Display summary
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`CATEGORIZATION SUMMARY FOR ${shopName}`);
      console.log(`${'─'.repeat(80)}`);
      console.log(`Total Products Updated: ${updatedCount}\n`);
      
      console.log("Category Distribution:");
      const sortedCategories = Object.entries(categoryStats)
        .sort((a, b) => b[1] - a[1]);
      
      for (const [category, count] of sortedCategories) {
        const percentage = ((count / updatedCount) * 100).toFixed(1);
        const bar = '█'.repeat(Math.round(count / 2));
        console.log(`  ${category.padEnd(25)} ${bar} ${count} (${percentage}%)`);
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log("✅ Categorization Complete!");
    console.log(`${'='.repeat(80)}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

categorizeAllProducts();
