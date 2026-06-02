import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split("\n").forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return;
    const eq = t.indexOf("=");
    if (eq === -1) return;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  });
}

const app = initializeApp({
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai"
});
const db = getFirestore(app);

const TARGET_CATS = [
  "Pooja Items",
  "Oils & Ghee",
  "Instant Foods & Noodles"
];

async function main() {
  const snapshot = await getDocs(collection(db, "products"));
  let updatedCount = 0;
  
  for (const d of snapshot.docs) {
    const data = d.data();
    if (!TARGET_CATS.includes(data.category)) continue;

    const nameLower = data.name ? data.name.toLowerCase() : '';
    const localName = data.localName ? data.localName.toLowerCase() : '';
    
    // Determine if it's loose
    const isLoose = nameLower.includes('loose') || nameLower.includes('khula') || localName.includes('खुला') || (data.unit === 'kg' && !nameLower.match(/5kg|10kg|1kg/));
    
    let searchQuery = data.name + " grocery product india";
    
    if (data.category === "Pooja Items") {
      searchQuery = data.name + " pooja item india";
      if (nameLower.includes("agarbatti") || nameLower.includes("dhoop")) {
         searchQuery = data.name + " agarbatti dhoop india";
      }
    } else if (data.category === "Oils & Ghee") {
      searchQuery = data.name + " cooking oil ghee india";
      if (isLoose) {
        searchQuery = data.name.replace(/loose|khula/ig, '').trim() + " cooking oil in bowl raw";
      }
    } else if (data.category === "Instant Foods & Noodles") {
      searchQuery = data.name + " instant food grocery product india";
      if (isLoose) {
        searchQuery = data.name.replace(/loose|khula/ig, '').trim() + " heap isolated on white background without packet";
      }
    }
    
    if (isLoose && data.category !== "Oils & Ghee" && data.category !== "Instant Foods & Noodles") {
        const baseName = data.name.replace(/loose|khula/ig, '').trim();
        searchQuery = "heap of " + baseName + " isolated on white background without packet";
    }

    const encodedName = encodeURIComponent(searchQuery);
    const newImageUrl = `https://tse1.mm.bing.net/th?q=${encodedName}`;
    
    console.log(`[${data.category}] ${data.name} -> ${searchQuery}`);
    
    await updateDoc(doc(db, "products", d.id), {
      imageUrl: newImageUrl
    });
    updatedCount++;
  }
  
  console.log(`Updated ${updatedCount} products.`);
  process.exit(0);
}

main().catch(console.error);
