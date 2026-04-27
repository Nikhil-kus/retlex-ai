# Kirana Store Catalog Feature

## Overview
Added a pre-built catalog of 70+ standard Indian kirana store products that shop owners can import with one click.

## What Was Added

### 1. **Kirana Products Catalog** (`src/lib/kirana-catalog.ts`)
- 70+ essential products organized by category:
  - **Staples**: Atta, Rice, Dals (13 items)
  - **Oils & Salt & Sugar**: Oil, Salt, Gud (7 items)
  - **Biscuits & Snacks**: Parle-G, Maggi, Kurkure, etc. (9 items)
  - **Personal Care**: Soap, Shampoo, Toothpaste, Oil (9 items)
  - **Cleaning**: Detergent, Vim, Harpic, Phenyl (7 items)
  - **Dairy & Beverage**: Milk, Tea, Coffee, Paneer, Curd (9 items)
  - **Spices**: Haldi, Mirchi, Dhaniya, Masala (6 items)
  - **Sweets & Confectionery**: Chocolate, Candy, Gum (5 items)
  - **Misc**: Matchbox, Agarbatti, Foil, Tissue, Bag (5 items)

Each product includes:
- English name
- Hindi local name
- Search aliases (both English and Hindi)
- Unit (kg, l, g, ml, pc)
- Base quantity
- Pre-configured price

### 2. **Kirana Import API** (`src/app/api/products/kirana-import/route.ts`)
- POST endpoint that imports all kirana products to a shop
- Validates shop exists before importing
- Adds all products with timestamps
- Returns count of imported products

### 3. **Updated Catalog Setup Page** (`src/app/shop/catalog-setup/page.tsx`)
- Added "Kirana Store" button as first option
- Shows product categories with visual cards
- One-click import for all 70+ products
- Confirmation dialog before import
- Success message with count of imported items

## How to Use

1. Go to **Shop Setup** → **Import Catalog Templates**
2. Click the **"Kirana Store"** button (with ⚡ icon)
3. Review the product categories
4. Click **"Import All [X] Products"**
5. Confirm the import
6. All products are added to your catalog with pre-configured prices
7. Edit prices later in the Products section as needed

## Features

✅ **Quick Setup**: Import 70+ products in seconds
✅ **Pre-configured**: All products have prices and units set
✅ **Searchable**: Products have Hindi and English aliases for search
✅ **Editable**: Prices can be adjusted after import
✅ **Organized**: Products grouped by category
✅ **Bilingual**: English names with Hindi translations

## Files Modified/Created

- ✅ Created: `src/lib/kirana-catalog.ts` - Product data
- ✅ Created: `src/app/api/products/kirana-import/route.ts` - Import API
- ✅ Modified: `src/app/shop/catalog-setup/page.tsx` - UI for Kirana import

## Build Status
✅ Build successful - No errors or warnings
