# Kirana Billing MVP

A modern, responsive, mobile-first MVP web application for local Kirana shops.

## Features fully working:
- **Dashboard**: Sales overview, profit tracking, recent bills.
- **Product Catalog**: Add, edit, manage local products with price, unit, and barcode tracking.
- **Billing Mode 3 (Manual)**: Fast product search, cart logic, quantity adjustment, mark as Paid/Unpaid, generate bill.
- **Bill History & Unpaid Tracker**: View past bills, track pending payments, and quickly mark bills as paid.
- **Customer QR Flow (`/qr/[shopId]`)**: Dedicated public view for customers to see their bills generated in the last 5 minutes without logging in.
- **Print & Share**: Print invoices natively or generate WhatsApp-friendly text.

## AI fallback-assisted features:
- **Billing Mode 1 (OCR Slip)**: Uses Google Cloud Vision API to extract text if the `GOOGLE_VISION_API_KEY` is provided in the `.env` file. If not, it falls back to a simulated OCR response to demonstrate the catalog fuzzy-matching and editable UI flow perfectly.
- **Billing Mode 2 (Vision Counter)**: Currently uses a simulated realistic API flow that randomly detects 2-3 products from the Shop's actual catalog. This proves the end-to-end workflow (Image -> AI labels -> Catalog Matching -> Human Review UI) is ready for a real edge Vision model API integration.

## Exact terminal commands to install and run

1. Ensure you have Node.js installed.
2. Open terminal in this folder (`c:\Users\nikhil\retlexAi1demo`).
3. Run the following commands:
   ```bash
   npm install
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   npm run build
   npm run start
   ```
   *(Or just `npm run dev` for development mode).*

## Where to paste API Keys
Edit the `.env` file (copied from `.env.example`) in the root directory. Paste your string next to:
`GOOGLE_VISION_API_KEY="your_actual_key_here"`

No other automated APIs are required. If you want a real object detection AI instead of the simulated one for Mode 2, you can replace the logic inside `src/app/api/vision/analyze/route.ts` with an integration to OpenAI GPT-4 Vision or Claude 3.5 Sonnet Vision.

## How to test the 3 Modes step by step

1. Navigate to **http://localhost:3000/billing**.
2. **Mode 3 (Manual)**: Click the "Manual Search" tab. Type "Tata" or "Ashirvaad". Select the item. Adjust quantity and click Generate Bill.
3. **Mode 1 (Slip Scan)**: Click the "Scan Slip" tab. Click the upload box to select an image of a handwritten list. Click "Analyze". Wait 1-2 seconds. Review the matched items, fix any unrecognized entries, confirm, and generate bill.
4. **Mode 2 (Counter Mode)**: Click the "Scan Counter" tab. Upload a picture of items. Click "Analyze". The simulated AI will suggest a few products from your catalog. Confirm the quantities and generate bill.
