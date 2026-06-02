import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, query, where, doc, updateDoc, setDoc
} from "firebase/firestore";

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

const VERIFIED_PRODUCTS = [
  {
    original: "Goodricke Chai CTC Leaf Tea 500g",
    correct: "Goodricke Strong CTC Leaf Tea",
    imageUrl: "https://m.media-amazon.com/images/I/71YyP6X6F4L._SL1500_.jpg",
    variant: "500g"
  },
  {
    original: "Mr. Mahabar Soap (100g)",
    correct: "Nip Mahabar Dishwash Bar",
    imageUrl: "https://cdn.grofers.com/app/images/products/full_screen/pro_3226.jpg",
    variant: "100g"
  },
  {
    original: "Nirma Soap Small (₹10)",
    correct: "Nirma Beauty Soap",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/l/285687_6-nirma-beauty-soap-pink-100-g-carton.jpg",
    variant: "Small Packet"
  },
  {
    original: "JO Soap (100g)",
    correct: "Jo Lime Sparkling Fresh Soap",
    imageUrl: "https://cdn.grofers.com/app/images/products/full_screen/pro_143553.jpg",
    variant: "100g"
  },
  {
    original: "Kasturi Agarbatti Large Box",
    correct: "Shubhkart Nirmal Kasturi Agarbatti Sticks",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/l/40101854_1-shubhkart-nirmal-kasturi-agarbatti-sticks.jpg",
    variant: "Large Box"
  },
  {
    original: "Kala Bhoot Mosquito Repellent Standard",
    correct: "Kala Bhoot Mosquito Repellent Sticks",
    imageUrl: "https://m.media-amazon.com/images/I/41-t9-y-vFL.jpg",
    variant: "Standard"
  },
  {
    original: "Simply Namaste Badam Drink Strip (10 sachets)",
    correct: "Namaste India Chill Karr Badam Flavoured Milk",
    imageUrl: "https://www.jiomart.com/images/product/original/491551508/namaste-india-chill-karr-badam-flavoured-milk-180-ml-bottle-product-images-o491551508-p590041285-0-202203151614.jpg",
    variant: "Strip (10 sachets)"
  },
  {
    original: "Kashu Tulsi Ashtagandha Tika Standard",
    correct: "Kashi Tulsi Ashtagandha Chandan Tika",
    imageUrl: "https://m.media-amazon.com/images/I/61+0Wv-IEL._SL1500_.jpg",
    variant: "Standard"
  },
  {
    original: "Golden Wood Agarbatti Large Box",
    correct: "Cycle Woods Natural Masala Incense Sticks",
    imageUrl: "https://www.bigbasket.com/media/uploads/p/l/40101854_1-cycle-woods-natural-masala-incense-sticks.jpg",
    variant: "Large Box"
  },
  {
    original: "Nandanvan Chai 500g",
    correct: "Nandanvan Classic Strong Tea Liquor",
    imageUrl: "https://m.media-amazon.com/images/I/71T8pWv-IEL._AC_UF1000,1000_QL80_.jpg",
    variant: "500g"
  }
];

async function main() {
  console.log("🚀 Updating products with verified data...\n");

  for (const item of VERIFIED_PRODUCTS) {
    const q = query(
      collection(db, "products"),
      where("shopId", "==", SHOP_ID),
      where("name", "==", item.original)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      console.log(`⚠️  Could not find product: ${item.original}`);
      continue;
    }

    for (const d of snap.docs) {
      await updateDoc(doc(db, "products", d.id), {
        name: item.correct,
        imageUrl: item.imageUrl,
        imageSource: "verified_manual",
        updatedAt: new Date().toISOString()
      });
      console.log(`✅ Updated: ${item.original} -> ${item.correct}`);

      // Also update globalCatalog
      const gcId = `gc_${item.correct.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 60)}`;
      await setDoc(doc(db, "globalCatalog", gcId), {
        name: item.correct,
        imageUrl: item.imageUrl,
        updatedAt: new Date().toISOString(),
        verified: true
      }, { merge: true });
    }
  }

  console.log("\n✨ Verification update complete!");
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
