import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function listShops() {
  try {
    const shopsSnapshot = await getDocs(collection(db, "shops"));
    if (shopsSnapshot.empty) {
      console.log("No shops found");
      return;
    }
    for (const shopDoc of shopsSnapshot.docs) {
      console.log(`Shop Name: "${shopDoc.data().name}" | ID: ${shopDoc.id}`);
    }
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

listShops();
