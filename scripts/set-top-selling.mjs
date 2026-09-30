/**
 * set-top-selling.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Sets sortOrder = 1..14 on the 14 target "top selling" products for
 * Shri Krishna Kirana (shopId: Yvgf5Us3pdNGHa0ljBGr).
 *
 * Also clears sortOrder from any OTHER product in the shop so the list
 * stays clean.
 *
 * Run: node scripts/set-top-selling.mjs
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteField,
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

// ── The 14 target products in desired display order ────────────────────────
// Each entry is the Firestore document ID from krishna-products-catalog.json
const TOP_SELLING = [
  { order: 1,  id: "rW7a1xYOH7fAPqIuTFPQ", label: "Kriti Refined Sunflower Oil 1L (Krati/Refine Tel)" },
  { order: 2,  id: "2dwxfLOBceK8GxjhRyYC", label: "Zeeba Basmati Rice 1kg (Chawal)" },
  { order: 3,  id: "BbjN3N7qlNG7bMHEtAHq", label: "Krishna KT Gold Tea 100g (Chai Patti)" },
  { order: 4,  id: "WjcprXC0GQOglD5ghnFs", label: "Bafla Baati Atta 5kg (Aata 5 Kilo)" },
  { order: 5,  id: "GfvDSqCEIHClIugKJlZO", label: "Royal Chana 200g" },
  { order: 6,  id: "2vF6TP6B6xy0niETH6uz", label: "Silver Coin Mota Besan 500g" },
  { order: 7,  id: "iKdkl8uwBp7Go4H8UUVT", label: "Surabhi Classic Tomato Ketchup 500g (Tomato Sauce)" },
  { order: 8,  id: "1XOE0m7E5G9SiXJsoymg", label: "A-1 Namkeen Mota Laung Sev 200g" },
  { order: 9,  id: "znmzFld7iwiZDQOazGWd", label: "Catch Salt 1kg (Namak)" },
  { order: 10, id: "14zQrMAWe4azXO8L2vDF", label: "Dettol Original Soap 75g (Dettol Sabun)" },
  { order: 11, id: "K6mUrqu3GbnFJNRFWgo0", label: "Parle-G Gluco Biscuit (Parle G)" },
  { order: 12, id: "3cf8dtJ1rTmYa0whKIfS", label: "Dammani's Filtered Groundnut Oil 1L (Moongfali Tel)" },
  { order: 13, id: "rUsHStQk2dh2PVQCAzpM", label: "Silver Coin Suji 500g (Rawa)" },
  { order: 14, id: "6fkXzQKoMIRebVuxr1tI", label: "Brooke Bond Red Label Tea 100g (Chai Patti alt)" },
];

const TOP_IDS = new Set(TOP_SELLING.map((t) => t.id));

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("🏪 Shri Krishna Kirana — Set Top-Selling Products\n");
  console.log(`Shop ID: ${SHOP_ID}`);
  console.log("─".repeat(60));

  // Fetch all products for this shop
  const snap = await getDocs(
    query(collection(db, "products"), where("shopId", "==", SHOP_ID))
  );
  const all = snap.docs.map((d) => ({ firestoreId: d.id, ref: d.ref, ...d.data() }));
  console.log(`\nTotal products in shop: ${all.length}`);

  // ── STEP 1: Set sortOrder on top-selling products ─────────────────────────
  console.log("\n📌 Setting sortOrder on top-selling products...\n");
  let setCount = 0;
  let notFound = [];

  for (const target of TOP_SELLING) {
    const product = all.find((p) => p.firestoreId === target.id);
    if (!product) {
      console.warn(`  ⚠️  NOT FOUND: ${target.label} (id: ${target.id})`);
      notFound.push(target);
      continue;
    }
    await updateDoc(doc(db, "products", target.id), { sortOrder: target.order });
    console.log(`  ✅ [${target.order}] ${product.name}`);
    setCount++;
    await sleep(150);
  }

  // ── STEP 2: Clear sortOrder from all other products in the shop ───────────
  console.log("\n🧹 Clearing sortOrder from non-top-selling products...\n");
  let clearCount = 0;
  const others = all.filter(
    (p) => !TOP_IDS.has(p.firestoreId) && p.sortOrder !== undefined
  );

  for (const p of others) {
    await updateDoc(doc(db, "products", p.firestoreId), {
      sortOrder: deleteField(),
    });
    console.log(`  🗑️  Cleared: ${p.name}`);
    clearCount++;
    await sleep(100);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log(`✅ sortOrder set on  : ${setCount} products`);
  console.log(`🗑️  sortOrder cleared: ${clearCount} products`);
  if (notFound.length > 0) {
    console.log(`\n⚠️  Products not found in Firestore (${notFound.length}):`);
    notFound.forEach((t) => console.log(`   • ${t.label}`));
    console.log(
      "\n   These IDs are from the local catalog JSON but may not exist"
    );
    console.log("   in Firestore yet. Run the relevant seed scripts first.");
  }
  console.log("\n🎉 Done! The Top Selling section will now show these 14 products.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
