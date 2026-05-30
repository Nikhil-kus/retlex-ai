import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

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
const PRODUCT_ID = "gyVODEk92hct3BoLGSp4";
const IMAGE_URL = "https://basantbaharagarbatti.com/wp-content/uploads/2023/04/52-600x600.jpg";

async function main() {
  console.log(`Updating Basant Bahar Ram Bhumi Agarbatti 70g (ID: ${PRODUCT_ID}) to official image: ${IMAGE_URL}`);
  
  // Update in products
  await updateDoc(doc(db, "products", PRODUCT_ID), {
    imageUrl: IMAGE_URL
  });
  console.log("Updated products collection.");

  // Update in globalCatalog
  const globalQuery = query(collection(db, "globalCatalog"), where("name", "==", "Basant Bahar Ram Bhumi Agarbatti 70g"));
  const globalSnap = await getDocs(globalQuery);
  if (!globalSnap.empty) {
    const globalId = globalSnap.docs[0].id;
    await updateDoc(doc(db, "globalCatalog", globalId), {
      imageUrl: IMAGE_URL
    });
    console.log(`Updated globalCatalog collection document: ${globalId}`);
  } else {
    console.log("No globalCatalog match found.");
  }

  process.exit(0);
}

main().catch(console.error);
