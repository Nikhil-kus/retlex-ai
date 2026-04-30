# Worker Interface Feature

## Overview
A new worker interface has been added to the Kirana MVP app. Workers can view pending orders and mark them as completed. The system uses polling (auto-refresh every 2 seconds) to keep the order queue updated.

## What Changed

### 1. Backend Changes

#### `src/app/api/bills/route.ts`
- Added `orderStatus: 'PENDING'` field when creating new bills
- All new bills start with `orderStatus = 'PENDING'`

#### `src/app/api/bills/[id]/route.ts`
- Updated PUT endpoint to handle both `status` (payment) and `orderStatus` (order fulfillment)
- Now accepts: `{ status?: string, orderStatus?: string }`

### 2. New Page: `/worker`

**Location:** `src/app/worker/page.tsx`

**Features:**
- Displays only bills with `orderStatus === 'PENDING'`
- Auto-refreshes every 2 seconds (polling)
- Shows pending order count
- Grid layout for order cards
- One-click "Mark Done" button

**Order Card Shows:**
- Bill number and time
- Status badge (PENDING)
- List of items with quantities and units
- Total amount
- Mark Done button

**Functionality:**
- Fetches all bills from `/api/bills?shopId={shopId}`
- Filters for PENDING orders only
- Auto-refresh interval: 2 seconds
- When "Mark Done" clicked:
  - Updates `orderStatus` to 'COMPLETED'
  - Removes from worker screen immediately
  - Shows success/error feedback

## How It Works

### Flow
```
1. Bill created in Billing page
   ↓
2. Bill saved with orderStatus = 'PENDING'
   ↓
3. Worker page fetches bills every 2 seconds
   ↓
4. Shows only PENDING bills
   ↓
5. Worker clicks "Mark Done"
   ↓
6. orderStatus updated to 'COMPLETED'
   ↓
7. Bill removed from worker screen
```

### Data Structure
```typescript
Bill {
  id: string
  billNumber: string
  shopId: string
  items: Item[]
  totalAmount: number
  status: 'PAID' | 'UNPAID'           // Payment status (unchanged)
  orderStatus: 'PENDING' | 'COMPLETED' // Order fulfillment status (NEW)
  createdAt: string
  date: Timestamp
  ...
}
```

## No Breaking Changes

✅ Existing billing logic unchanged
✅ Voice recognition untouched
✅ Cart logic untouched
✅ Bill History page shows all bills (no changes)
✅ Payment status (`status` field) separate from order status (`orderStatus`)
✅ No authentication required
✅ Same shop, same data

## Usage

### For Customers/Billing
1. Go to `/billing`
2. Add items to cart
3. Click "Generate Bill"
4. Bill is created with `orderStatus = 'PENDING'`

### For Workers
1. Go to `/worker`
2. See all pending orders
3. Review items and total
4. Click "Mark Done" when order is ready
5. Order disappears from queue

### For Management
1. Go to `/history`
2. See all bills (PENDING and COMPLETED)
3. Filter by bill number or phone

## API Endpoints

### GET `/api/bills?shopId={shopId}`
Returns all bills for a shop (both PENDING and COMPLETED)

### PUT `/api/bills/{id}`
Update bill status or order status
```json
{
  "status": "PAID",           // Optional: payment status
  "orderStatus": "COMPLETED"  // Optional: order status
}
```

## Future Enhancements (Optional)
- WebSocket instead of polling for real-time updates
- Worker assignment to specific orders
- Order priority/urgency levels
- Time tracking for order completion
- Notifications when new orders arrive
- Order history for workers

## Testing

1. **Create a bill:**
   - Go to `/billing`
   - Add items and generate bill
   - Check database: bill should have `orderStatus: 'PENDING'`

2. **View in worker interface:**
   - Go to `/worker`
   - Should see the new bill
   - Auto-refresh should work (check network tab)

3. **Mark as done:**
   - Click "Mark Done"
   - Bill should disappear
   - Check database: `orderStatus` should be 'COMPLETED'

4. **Verify history:**
   - Go to `/history`
   - Bill should still be visible
   - Status should show as COMPLETED (if you add UI for it)
