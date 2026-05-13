/**
 * db-migrate.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Safe database migration script for Retlex AI.
 *
 * What this script does (in order):
 *   1. Lists ALL shops in Firestore so you can identify the duplicate.
 *   2. Asks you to confirm which shop to DELETE (the unused test shop).
 *   3. Deletes all products belonging to the deleted shop.
 *   4. Deletes the shop document itself.
 *   5. Seeds the `globalCatalog` collection from the surviving shop's products.
 *      - globalCatalog acts as a read-only template library.
 *      - Each doc is a copy of a shop product, stripped of shopId.
 *   6. Writes ACTIVE_SHOP_ID to .env so the app always loads the correct shop.
 *
 * Safety guarantees:
 *   - Nothing is deleted until you type the shop name to confirm.
 *   - The surviving shop's products are NEVER touched.
 *   - globalCatalog is additive — existing docs are skipped (idempotent).
 *   - All operations are logged to console.
 *
 * Usage:
 *   node scripts/db-migrate.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore, collection, getDocs, deleteDoc,
  addDoc, doc, query, where, writeBatch
} from "firebase/firestore";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";

// ── Load .env ────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

// ── Firebase init ─────────────────────────────────────────────────────────────
const app = getApps().length === 0
  ? initializeApp({
      apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
      authDomain: "retlex-ai.firebaseapp.com",
      projectId: "retlex-ai",
    })
  : getApps()[0];
const db = getFirestore(app);

// ── Helpers ───────────────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

function log(msg) { console.log(msg); }
function sep() { console.log("─".repeat(72)); }

// ── Step 1: List all shops ────────────────────────────────────────────────────
async function listShops() {
  const snap = await getDocs(collection(db, "shops"));
  if (snap.empty) { log("No shops found. Nothing to do."); process.exit(0); }
  const shops = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return shops;
}

// ── Step 2: Count products per shop ──────────────────────────────────────────
async function countProducts(shopId) {
  const snap = await getDocs(query(collection(db, "products"), where("shopId", "==", shopId)));
  return snap.size;
}

// ── Step 3: Delete shop + its products ───────────────────────────────────────
async function deleteShopAndProducts(shopId) {
  log(`\n🗑  Fetching products for shop ${shopId}...`);
  const snap = await getDocs(query(collection(db, "products"), where("shopId", "==", shopId)));
  log(`   Found ${snap.size} products to delete.`);

  // Firestore batch delete (max 500 per batch)
  let batch = writeBatch(db);
  let count = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    count++;
    if (count % 499 === 0) {
      await batch.commit();
      batch = writeBatch(db);
      log(`   Deleted ${count} products so far...`);
    }
  }
  if (count % 499 !== 0) await batch.commit();
  log(`   ✅ Deleted ${count} products.`);

  // Delete the shop document
  await deleteDoc(doc(db, "shops", shopId));
  log(`   ✅ Deleted shop document ${shopId}.`);
}

// ── Step 4: Seed globalCatalog from surviving shop ────────────────────────────
async function seedGlobalCatalog(shopId) {
  log(`\n🌐 Seeding globalCatalog from shop ${shopId}...`);

  // Fetch all products of the surviving shop
  const snap = await getDocs(query(collection(db, "products"), where("shopId", "==", shopId)));
  const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  log(`   Found ${products.length} products to seed into globalCatalog.`);

  // Fetch existing globalCatalog to avoid duplicates (idempotent)
  const existingSnap = await getDocs(collection(db, "globalCatalog"));
  const existingNames = new Set(
    existingSnap.docs.map(d => (d.data().name || "").toLowerCase().trim())
  );
  log(`   globalCatalog already has ${existingSnap.size} entries — skipping duplicates.`);

  let added = 0;
  let skipped = 0;

  for (const product of products) {
    const nameLower = (product.name || "").toLowerCase().trim();
    if (existingNames.has(nameLower)) { skipped++; continue; }

    // Strip shopId — globalCatalog entries are shop-agnostic templates
    const { id: _id, shopId: _shopId, ...catalogEntry } = product;

    await addDoc(collection(db, "globalCatalog"), {
      ...catalogEntry,
      // Metadata for catalog management
      sourceShopId: shopId,       // which shop this was seeded from
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    existingNames.add(nameLower); // prevent duplicates within this run
    added++;
  }

  log(`   ✅ Added ${added} new entries to globalCatalog. Skipped ${skipped} duplicates.`);
  return added;
}

// ── Step 5: Write ACTIVE_SHOP_ID to .env ─────────────────────────────────────
function writeActiveShopId(shopId) {
  let envContent = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

  if (envContent.includes("ACTIVE_SHOP_ID=")) {
    // Replace existing value
    envContent = envContent.replace(/^ACTIVE_SHOP_ID=.*/m, `ACTIVE_SHOP_ID="${shopId}"`);
  } else {
    // Append
    envContent += `\n# Active shop — set by db-migrate.mjs\nACTIVE_SHOP_ID="${shopId}"\n`;
  }

  writeFileSync(envPath, envContent, "utf8");
  log(`\n✅ ACTIVE_SHOP_ID="${shopId}" written to .env`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  sep();
  log("  Retlex AI — Database Migration Script");
  log("  Safe shop deduplication + globalCatalog seeding");
  sep();

  // 1. List shops
  log("\n📋 Fetching all shops from Firestore...\n");
  const shops = await listShops();

  for (let i = 0; i < shops.length; i++) {
    const s = shops[i];
    const count = await countProducts(s.id);
    log(`  [${i + 1}] ${s.name || "(no name)"}`);
    log(`      ID      : ${s.id}`);
    log(`      Mobile  : ${s.mobile || "—"}`);
    log(`      Address : ${s.address || "—"}`);
    log(`      Products: ${count}`);
    log("");
  }

  if (shops.length === 1) {
    log("✅ Only one shop found — no duplicate to delete.");
    log("\nProceeding to seed globalCatalog...");
    await seedGlobalCatalog(shops[0].id);
    writeActiveShopId(shops[0].id);
    rl.close();
    process.exit(0);
  }

  // 2. Ask which shop to DELETE
  sep();
  log("\n⚠️  Two shops found. You need to delete the unused test shop.");
  log("    The surviving shop's data will be preserved and seeded to globalCatalog.\n");

  const deleteIndexStr = await ask("Enter the NUMBER of the shop to DELETE (or 'skip' to skip deletion): ");

  if (deleteIndexStr.trim().toLowerCase() === "skip") {
    log("\nSkipping deletion.");
  } else {
    const deleteIndex = parseInt(deleteIndexStr.trim(), 10) - 1;
    if (isNaN(deleteIndex) || deleteIndex < 0 || deleteIndex >= shops.length) {
      log("Invalid selection. Aborting."); rl.close(); process.exit(1);
    }

    const shopToDelete = shops[deleteIndex];
    const shopToKeep = shops.find((_, i) => i !== deleteIndex);

    sep();
    log(`\n🗑  You selected to DELETE:`);
    log(`   Name: ${shopToDelete.name}`);
    log(`   ID  : ${shopToDelete.id}`);
    log(`\n✅  You will KEEP:`);
    log(`   Name: ${shopToKeep.name}`);
    log(`   ID  : ${shopToKeep.id}`);
    log("");

    // 3. Confirm by typing shop name
    const confirm = await ask(`Type the name of the shop to DELETE exactly to confirm: `);
    if (confirm.trim() !== shopToDelete.name) {
      log("\n❌ Name did not match. Aborting — nothing was deleted.");
      rl.close(); process.exit(1);
    }

    // 4. Delete
    await deleteShopAndProducts(shopToDelete.id);

    // 5. Seed globalCatalog from surviving shop
    await seedGlobalCatalog(shopToKeep.id);

    // 6. Write ACTIVE_SHOP_ID
    writeActiveShopId(shopToKeep.id);
  }

  sep();
  log("\n🎉 Migration complete!");
  log("   • Duplicate shop deleted");
  log("   • globalCatalog seeded from your main shop");
  log("   • ACTIVE_SHOP_ID written to .env");
  log("   • Restart your dev server for changes to take effect\n");
  sep();

  rl.close();
  process.exit(0);
}

main().catch(e => { console.error("Migration failed:", e); rl.close(); process.exit(1); });
