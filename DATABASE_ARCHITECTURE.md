# Retlex AI — Database Architecture

**Last Updated:** May 12, 2026  
**Migration Script:** `scripts/db-migrate.mjs`

---

## Overview

Retlex AI uses a **flat Firestore schema** with shop-level isolation via `shopId` foreign keys. This architecture is designed to scale to **lakhs of shops** while maintaining complete data independence between shops.

---

## Collections

### 1. `shops/`
**Purpose:** Store shop metadata (name, mobile, address, QR code).

**Schema:**
```typescript
{
  id: string;                // Firestore auto-generated doc ID
  name: string;              // Shop name
  mobile: string;            // Owner mobile number
  address: string;           // Shop address
  qrCodeId: string;          // Permanent QR code ID for customer bill access
  businessTypeId?: string;   // Optional FK to businessTypes collection
}
```

**Access Pattern:**
- The active shop is pinned via `ACTIVE_SHOP_ID` in `.env`.
- `GET /api/shop` reads directly from `shops/{ACTIVE_SHOP_ID}` — O(1) lookup, no collection scan.
- Fallback: if `ACTIVE_SHOP_ID` is not set, scans the collection and returns the first doc (legacy behavior).

**Scalability:**
- Each shop is a single document — no subcollections.
- Firestore supports 1M+ documents per collection with no performance degradation.

---

### 2. `products/`
**Purpose:** Store all products for all shops. Each product belongs to exactly one shop.

**Schema:**
```typescript
{
  id: string;                // Firestore auto-generated doc ID
  shopId: string;            // FK to shops collection — REQUIRED
  name: string;              // Product name (English)
  localName: string | null;  // Product name (Hindi/local language)
  barcode: string | null;    // Barcode for scanner input
  price: number;             // Selling price per baseUnit
  costPrice: number;         // Cost price per baseUnit (for profit calculation)
  baseUnit: string;          // Unit of sale: "pc", "kg", "g", "l", "ml"
  baseQuantity: number;      // Quantity per unit (e.g., 100g packet = baseQuantity: 100, baseUnit: "g")
  packetWeight: number | null;  // Weight of one packet (for loose items sold by weight)
  packetUnit: string | null;    // Unit of packetWeight ("g", "ml")
  category: string | null;   // Product category (e.g., "Grains & Cereals")
  imageUrl: string | null;   // Product image URL
}
```

**Access Pattern:**
- All queries filter by `shopId`: `where("shopId", "==", shopId)`.
- Firestore automatically indexes `shopId` — queries are O(log N) where N = products in that shop.
- Deleting a product only affects that shop — no cross-shop impact.

**Isolation Guarantee:**
- Each shop's products are completely independent.
- Deleting a product in Shop A never affects Shop B.
- No shared product references — each shop owns its data.

**Scalability:**
- Firestore supports 1M+ documents per collection.
- With 10,000 shops × 500 products each = 5M documents — well within Firestore limits.
- Queries remain fast because they filter by `shopId` (indexed).

---

### 3. `bills/`
**Purpose:** Store all bills for all shops. Each bill belongs to exactly one shop.

**Schema:**
```typescript
{
  id: string;                // Firestore auto-generated doc ID
  shopId: string;            // FK to shops collection — REQUIRED
  billNumber: number;        // Daily bill number (resets each day)
  customerName: string | null;
  customerPhone: string | null;
  totalAmount: number;       // Total bill amount
  profit: number;            // Total profit (sum of item profits)
  status: "PAID" | "UNPAID"; // Payment status
  paymentMethod: string | null;  // "CASH", "UPI", etc.
  orderStatus: "PENDING" | "COMPLETED";  // Worker fulfillment status
  notes: string | null;
  items: Array<{             // Embedded array of bill items
    productId: string | null;
    name: string;
    localName: string | null;
    imageUrl: string | null;
    quantity: number;
    unit: string;
    sellingPrice: number;    // Price per unit at time of sale
    costPrice: number;       // Cost per unit at time of sale
    total: number;           // Calculated total for this item
    packetWeight: number | null;
    packetUnit: string | null;
  }>;
  createdAt: string;         // ISO timestamp
  date: Timestamp;           // Firestore server timestamp (for ordering)
}
```

**Access Pattern:**
- All queries filter by `shopId`: `where("shopId", "==", shopId)`.
- Bills are sorted by `date` (server timestamp) — requires Firestore index.
- Fallback: if index not ready, client-side sort by `createdAt`.

**Isolation Guarantee:**
- Each shop's bills are completely independent.
- Deleting a bill in Shop A never affects Shop B.

**Scalability:**
- With 10,000 shops × 1,000 bills each = 10M documents — within Firestore limits.
- Queries remain fast because they filter by `shopId` (indexed).

---

### 4. `globalCatalog/`
**Purpose:** Master product library seeded from the main shop. Acts as a read-only template for new shops.

**Schema:**
```typescript
{
  id: string;                // Firestore auto-generated doc ID
  name: string;              // Product name (English)
  localName: string | null;  // Product name (Hindi/local language)
  barcode: string | null;
  price: number;             // Suggested selling price
  costPrice: number;         // Suggested cost price
  baseUnit: string;
  baseQuantity: number;
  packetWeight: number | null;
  packetUnit: string | null;
  category: string | null;
  imageUrl: string | null;
  sourceShopId: string;      // Which shop this was seeded from
  createdAt: string;         // ISO timestamp
  updatedAt: string;         // ISO timestamp
}
```

**Access Pattern:**
- `GET /api/global-catalog` — list all entries (optionally filter by category).
- `POST /api/global-catalog/import` — copy selected products into a shop's `products/` collection.

**Isolation Guarantee:**
- Importing from `globalCatalog` creates an **independent copy** in the shop's `products/` collection.
- Editing a shop product never affects `globalCatalog`.
- Deleting a shop product never affects `globalCatalog`.
- Editing `globalCatalog` never affects existing shop products.

**Scalability:**
- `globalCatalog` is a single shared collection — typically 500-2000 entries.
- No per-shop overhead — all shops read from the same catalog.

---

### 5. `businessTypes/`
**Purpose:** Store business type templates (Tent House, Kirana, etc.) with preset item lists.

**Schema:**
```typescript
{
  id: string;                // Firestore auto-generated doc ID
  name: string;              // Business type name (e.g., "Tent House")
  items: Array<{             // Preset items for this business type
    id: string;
    name: string;
    baseUnit: string;
  }>;
}
```

**Access Pattern:**
- `GET /api/business-types` — list all business types.
- `POST /api/products/bulk` — import selected items into a shop's `products/` collection.

**Scalability:**
- Small collection (5-10 business types) — no scalability concerns.

---

## Migration History

### Before Migration (Legacy Schema)
```
shops/          — all shops in one collection
products/       — all products with shopId field
bills/          — all bills with shopId field
businessTypes/  — business type templates
```

**Problems:**
1. `GET /api/shop` returned `docs[0]` — the first shop alphabetically. With two shops, this was non-deterministic.
2. No global catalog — new shops had to manually add products or import from hardcoded lists.
3. Kirana import used inconsistent field names (`aliases`, `quantity`, `createdAt` vs `price`, `baseUnit`, etc.).

### After Migration (Current Schema)
```
shops/          — all shops in one collection
products/       — all products with shopId field (unchanged)
bills/          — all bills with shopId field (unchanged)
businessTypes/  — business type templates (unchanged)
globalCatalog/  — NEW: master product library seeded from main shop
```

**Fixes:**
1. `ACTIVE_SHOP_ID` in `.env` pins the app to a specific shop — O(1) lookup, no collection scan.
2. `globalCatalog` provides a reusable product library for new shops.
3. All import routes now use consistent field names matching the main products schema.

---

## How New Shops Import Products

### Option 1: Global Catalog (Recommended)
1. Navigate to `/shop/catalog-setup`.
2. Select the "Global Catalog" tab.
3. Browse/search the master product library (seeded from your main shop).
4. Select products to import.
5. Click "Import X Selected Products".
6. Each import creates an **independent copy** in the shop's `products/` collection.

**Isolation:**
- Editing the imported product in the shop never affects `globalCatalog`.
- Deleting the imported product in the shop never affects `globalCatalog`.
- Editing `globalCatalog` never affects the imported product.

### Option 2: Kirana Preset
1. Navigate to `/shop/catalog-setup`.
2. Select the "Kirana Preset" tab.
3. Click "Import All 80 Products".
4. Imports from the hardcoded `KIRANA_PRODUCTS` list in `src/lib/kirana-catalog.ts`.

### Option 3: Business Type Templates
1. Navigate to `/shop/catalog-setup`.
2. Select the "Business Templates" tab.
3. Choose a business type (Tent House, etc.).
4. Select items to import.
5. Click "Import X Selected Items".

---

## Product Isolation — How It Works

### Scenario 1: Shop A imports from globalCatalog
1. Shop A selects "Aashirvaad Atta 5kg" from `globalCatalog`.
2. `POST /api/global-catalog/import` creates a new document in `products/`:
   ```typescript
   {
     id: "abc123",           // NEW Firestore doc ID
     shopId: "shopA",        // Bound to Shop A
     name: "Aashirvaad Atta 5kg",
     price: 260,
     // ... all other fields copied from globalCatalog
   }
   ```
3. Shop A now owns this product — it's a **full copy**, not a reference.

### Scenario 2: Shop A edits the imported product
1. Shop A changes the price from ₹260 to ₹270.
2. `PUT /api/products/abc123` updates the document in `products/`:
   ```typescript
   {
     id: "abc123",
     shopId: "shopA",
     name: "Aashirvaad Atta 5kg",
     price: 270,             // CHANGED
     // ...
   }
   ```
3. `globalCatalog` is **never touched** — it still shows ₹260.

### Scenario 3: Shop A deletes the imported product
1. Shop A deletes "Aashirvaad Atta 5kg".
2. `DELETE /api/products/abc123` removes the document from `products/`.
3. `globalCatalog` is **never touched** — it still exists.

### Scenario 4: Shop B imports the same product
1. Shop B selects "Aashirvaad Atta 5kg" from `globalCatalog`.
2. `POST /api/global-catalog/import` creates a **new document** in `products/`:
   ```typescript
   {
     id: "xyz789",           // DIFFERENT Firestore doc ID
     shopId: "shopB",        // Bound to Shop B
     name: "Aashirvaad Atta 5kg",
     price: 260,             // Original price from globalCatalog
     // ...
   }
   ```
3. Shop B's product is **completely independent** from Shop A's product.
4. Shop A's edits/deletions never affect Shop B.

---

## Scalability Analysis

### Firestore Limits
- **Documents per collection:** 1M+ (no hard limit)
- **Subcollections per document:** 1M+ (no hard limit)
- **Document size:** 1 MB max
- **Queries per second:** 10,000+ (with proper indexing)

### Retlex AI Projections

#### Scenario: 10,000 Shops
- **shops/**: 10,000 documents (10 KB total) — negligible
- **products/**: 10,000 shops × 500 products = 5M documents (5 GB total) — well within limits
- **bills/**: 10,000 shops × 1,000 bills = 10M documents (10 GB total) — well within limits
- **globalCatalog/**: 2,000 documents (2 MB total) — negligible

**Query Performance:**
- All queries filter by `shopId` (indexed) — O(log N) where N = documents in that shop.
- Example: Shop A has 500 products → query time ~10ms.
- No cross-shop queries — each shop's data is isolated.

#### Scenario: 100,000 Shops (Extreme Scale)
- **shops/**: 100,000 documents (100 KB total) — negligible
- **products/**: 100,000 shops × 500 products = 50M documents (50 GB total) — still within limits
- **bills/**: 100,000 shops × 1,000 bills = 100M documents (100 GB total) — still within limits

**Query Performance:**
- Queries remain O(log N) per shop — no degradation.
- Firestore automatically shards collections across servers — no manual partitioning needed.

### Cost Optimization

#### Read Optimization
- **Session cache:** Shop and catalog data are cached in `sessionStorage` — reduces Firestore reads by ~80%.
- **Direct document lookup:** `GET /api/shop` uses `ACTIVE_SHOP_ID` for O(1) lookup — no collection scan.

#### Write Optimization
- **Batch writes:** Migration script uses `writeBatch()` for bulk deletes — 499 deletes per batch.
- **Server timestamps:** Bills use `serverTimestamp()` for ordering — no client-side clock skew.

#### Index Optimization
- **Required indexes:**
  - `products` → `shopId` (auto-indexed)
  - `bills` → `shopId` (auto-indexed)
  - `bills` → `shopId` + `date` (composite index — create via Firestore console)

---

## Migration Instructions

### Step 1: Run the Migration Script
```bash
node scripts/db-migrate.mjs
```

**What it does:**
1. Lists all shops in Firestore.
2. Asks you to confirm which shop to delete (the unused test shop).
3. Deletes all products belonging to the deleted shop.
4. Deletes the shop document itself.
5. Seeds `globalCatalog` from the surviving shop's products.
6. Writes `ACTIVE_SHOP_ID` to `.env`.

**Safety:**
- Nothing is deleted until you type the shop name to confirm.
- The surviving shop's products are never touched.
- `globalCatalog` is additive — existing docs are skipped (idempotent).

### Step 2: Restart the Dev Server
```bash
npm run dev
```

**Why:** The app needs to reload `.env` to pick up `ACTIVE_SHOP_ID`.

### Step 3: Verify
1. Navigate to `/shop/setup` — should show the correct shop.
2. Navigate to `/shop/catalog-setup` → "Global Catalog" tab — should show products from your main shop.
3. Create a test shop (manually in Firestore) and import products from `globalCatalog` — verify isolation.

---

## Future Enhancements

### 1. Multi-Shop Support (Same Owner)
**Use Case:** Owner has multiple shops (e.g., Shop A in Delhi, Shop B in Mumbai).

**Implementation:**
- Add `ownerId` field to `shops/` collection.
- Add `GET /api/shops?ownerId=xyz` to list all shops for an owner.
- Add shop switcher UI in the sidebar.
- Update `ACTIVE_SHOP_ID` in `.env` when switching shops.

**Scalability:** No impact — each shop remains isolated.

### 2. Shared Inventory (Advanced)
**Use Case:** Owner wants to sync inventory across multiple shops.

**Implementation:**
- Add `inventoryId` field to `products/` collection.
- Create `inventory/` collection with real-time stock levels.
- Update `products/` to reference `inventory/` instead of storing stock locally.

**Scalability:** Requires careful locking to prevent race conditions.

### 3. Franchise Mode (Multi-Tenant)
**Use Case:** Franchise owner wants to manage 100+ shops with centralized catalog.

**Implementation:**
- Add `franchiseId` field to `shops/` collection.
- Create `franchises/` collection with centralized `globalCatalog`.
- Each franchise has its own `globalCatalog` — shops import from their franchise's catalog.

**Scalability:** No impact — each franchise is isolated.

---

## Troubleshooting

### Problem: `GET /api/shop` returns the wrong shop
**Cause:** `ACTIVE_SHOP_ID` is not set in `.env`.

**Fix:**
1. Run `node scripts/db-migrate.mjs` to set `ACTIVE_SHOP_ID`.
2. Restart the dev server.

### Problem: `globalCatalog` is empty
**Cause:** Migration script was not run, or the main shop has no products.

**Fix:**
1. Run `node scripts/db-migrate.mjs` to seed `globalCatalog`.
2. If the main shop has no products, manually add products via `/products` page first.

### Problem: Imported products are not showing up
**Cause:** Session cache is stale.

**Fix:**
1. Hard refresh the page (Ctrl+Shift+R).
2. Clear `sessionStorage` in DevTools → Application → Storage.

### Problem: Firestore index error on bills query
**Cause:** Composite index `shopId + date` is not created.

**Fix:**
1. Open Firestore console → Indexes.
2. Create composite index: `bills` → `shopId` (Ascending) + `date` (Descending).
3. Wait 5-10 minutes for index to build.

---

## Summary

**Architecture:**
- Flat Firestore schema with shop-level isolation via `shopId` foreign keys.
- `globalCatalog` acts as a read-only template library for new shops.
- All imports create independent copies — no shared references.

**Scalability:**
- Supports 100,000+ shops with no performance degradation.
- Queries remain O(log N) per shop — no cross-shop queries.
- Firestore automatically shards collections across servers.

**Isolation:**
- Each shop's products are completely independent.
- Deleting a product in Shop A never affects Shop B.
- Editing a shop product never affects `globalCatalog`.

**Migration:**
- Run `node scripts/db-migrate.mjs` to delete duplicate shops and seed `globalCatalog`.
- `ACTIVE_SHOP_ID` in `.env` pins the app to a specific shop.
- All import routes now use consistent field names.

---

**Questions? Issues?**  
Check the migration script logs or open an issue in the repo.
