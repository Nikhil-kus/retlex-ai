# Bulk Delete Products Feature

## Overview
Added bulk delete functionality to the Products page, allowing shop owners to select multiple products and delete them at once.

## What Was Added

### 1. **Bulk Delete API** (`src/app/api/products/bulk-delete/route.ts`)
- POST endpoint that accepts an array of product IDs
- Deletes multiple products in a single request
- Returns count of successfully deleted products
- Handles errors gracefully

### 2. **Updated Products Page** (`src/app/products/page.tsx`)
- Added checkboxes to each product row
- Added "Select All" checkbox in table header
- Added bulk delete button that appears when products are selected
- Shows count of selected products (e.g., "Delete 5")
- Confirmation dialog before bulk deletion
- Visual feedback (blue highlight) for selected products
- Success message showing count of deleted products

## How to Use

### Delete Single Product (Existing)
1. Go to **Products** page
2. Find the product
3. Click the **Trash icon** on the right
4. Confirm deletion

### Delete Multiple Products (New)
1. Go to **Products** page
2. Check the checkbox next to each product you want to delete
   - Or click the checkbox in the header to **Select All**
3. A red **"Delete [X]"** button appears at the top
4. Click the delete button
5. Confirm the bulk deletion
6. All selected products are deleted instantly

## Features

✅ **Select Individual Products**: Click checkboxes to select specific products
✅ **Select All**: Click header checkbox to select/deselect all products
✅ **Visual Feedback**: Selected products are highlighted in blue
✅ **Confirmation**: Double confirmation before deletion
✅ **Error Handling**: Gracefully handles deletion errors
✅ **Success Message**: Shows count of deleted products
✅ **Responsive**: Works on mobile and desktop

## Files Modified/Created

- ✅ Created: `src/app/api/products/bulk-delete/route.ts` - Bulk delete API
- ✅ Modified: `src/app/products/page.tsx` - Added bulk delete UI

## Build Status
✅ Build successful - No errors or warnings

## API Endpoint

**POST** `/api/products/bulk-delete`

Request body:
```json
{
  "shopId": "shop-id-here",
  "productIds": ["product-id-1", "product-id-2", "product-id-3"]
}
```

Response:
```json
{
  "success": true,
  "deletedCount": 3,
  "totalRequested": 3,
  "errors": null
}
```
