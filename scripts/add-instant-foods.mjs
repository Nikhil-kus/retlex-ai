/**
 * Add new Instant Foods & Noodles products to Firestore
 * Usage: node scripts/add-instant-foods.mjs
 */

import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim(); if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("="); if (eq === -1) continue;
    const k = t.slice(0, eq).trim(); const v = t.slice(eq+1).trim().replace(/^["']|["']$/g,"");
    if (!process.env[k]) process.env[k] = v;
  }
}

const app = getApps().length === 0 ? initializeApp({
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
}) : getApps()[0];
const db = getFirestore(app);
const SHOP_ID = "NjGBnhsc25w4jb2q6Ol4";
const CAT = "Instant Foods & Noodles";

const NEW_PRODUCTS = [
  {
    name: "Top Ramen",
    localName: "टॉप रामेन",
    aliases: ["top ramen", "ramen"],
    price: 15,
    costPrice: 12,
    imageUrl: "https://tse1.mm.bing.net/th?q=Top%20Ramen%20noodles%20grocery%20product%20india",
  },
  {
    name: "Wai Wai Noodles",
    localName: "वाई वाई नूडल्स",
    aliases: ["wai wai", "waiwai"],
    price: 15,
    costPrice: 12,
    imageUrl: "https://tse1.mm.bing.net/th?q=Wai%20Wai%20Noodles%20grocery%20product%20india",
  },
  {
    name: "Knorr Soupy Noodles",
    localName: "सूपी नूडल्स",
    aliases: ["knorr", "soupy noodles"],
    price: 20,
    costPrice: 16,
    imageUrl: "https://tse1.mm.bing.net/th?q=Knorr%20Soupy%20Noodles%20grocery%20product%20india",
  },
  {
    name: "MTR Upma Mix",
    localName: "उपमा मिक्स",
    aliases: ["upma", "mtr upma"],
    price: 45,
    costPrice: 36,
    imageUrl: "https://tse1.mm.bing.net/th?q=MTR%20Upma%20Mix%20grocery%20product%20india",
  },
  {
    name: "Gits Idli Mix",
    localName: "इडली मिक्स",
    aliases: ["idli mix", "gits idli"],
    price: 50,
    costPrice: 40,
    imageUrl: "https://tse1.mm.bing.net/th?q=Gits%20Idli%20Mix%20grocery%20product%20india",
  },
  {
    name: "MTR Poha Mix",
    localName: "पोहा मिक्स",
    aliases: ["poha mix", "mtr poha"],
    price: 40,
    costPrice: 32,
    imageUrl: "https://tse1.mm.bing.net/th?q=MTR%20Poha%20Mix%20grocery%20product%20india",
  },
];

async function main() {
  console.log("🍜 Adding Instant Foods & Noodles products...\n");

  // Fetch existing products in this category to avoid duplicates
  const snap = await getDocs(
    query(collection(db, "products"), where("shopId", "==", SHOP_ID), where("category", "==", CAT))
  );
  const existingNames = new Set(snap.docs.map(d => d.data().name?.toLowerCase().trim()));
  console.log(`   Existing products in category: ${existingNames.size}`);

  let added = 0, skipped = 0;

  for (const p of NEW_PRODUCTS) {
    const key = p.name.toLowerCase().trim();
    if (existingNames.has(key)) {
      console.log(`⏭️  Skipped (already exists): ${p.name}`);
      skipped++;
      continue;
    }

    await addDoc(collection(db, "products"), {
      name: p.name,
      localName: p.localName,
      aliases: p.aliases,
      price: p.price,
      costPrice: p.costPrice,
      baseUnit: "pkt",
      baseQuantity: 1,
      packetWeight: null,
      packetUnit: null,
      imageUrl: p.imageUrl,
      category: CAT,
      barcode: null,
      shopId: SHOP_ID,
      quantity: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`✅ Added: ${p.name} @ ₹${p.price}`);
    added++;
  }

  console.log(`\n══════════════════════════════════`);
  console.log(`✅ Added: ${added} | ⏭️  Skipped: ${skipped}`);
  console.log(`══════════════════════════════════\n`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
