# Shop categories

New owners choose Kirana, Tent House, or Electronics, enter their shop details,
and select products. A new installation starts at `/`. `/?new=1` opens setup
even when a shop is remembered. Existing shops without the new fields retain
their billing entry point and are treated as Kirana unless their embedded
business type identifies Tent or Electronics.

## Catalog

- Kirana retains the shared grocery catalog and the existing starter products.
- Tent House has 12 starter items.
- Electronics has 16 starter items.
- All three shop types can select the same 8 universal items.
- Hindi names and aliases support searching and the existing product matcher.
- Example rates are editable; Tent rates are per item per event. Booking dates,
  returns, deposits, and rental availability are outside this billing change.

`shopType` persists on shops and imported products. New shops also have
`catalogSetupComplete: false`; finishing or explicitly skipping product setup
sets it to `true`. Incomplete owner sessions resume product selection.
Changing the category in Shop Setup changes suggestions without deleting
existing products or bills.

`GET /api/global-catalog?shopId=…` resolves the saved category on the server and
returns matching products plus universal items. Imports validate category and
numeric fields, copy only supported product fields, and skip existing names.
Billing now lives in `src/components/pages/BillingWorkspace.tsx` and receives
the resolved shop directly. Legacy billing/setup URLs redirect to the remembered
shop instead of selecting an arbitrary database shop.

## Photos

All 36 new product photos are stored in `public/catalog-images/`. Wikimedia
source pages, authors, and licenses are retained in `credits.json`, attached
to starter products, and displayed at `/image-credits`. Photos are resized and
converted to JPEG; each retains its original license. They are representative
images rather than guarantees of a particular brand or model.

Download or repair assets with:

```sh
node --import tsx scripts/download-shop-catalog-images.ts
```

## Verification

```sh
npm run test:catalog
npm run test:voice
npm run test:billing
npx tsc --noEmit --incremental false
npm run build -- --webpack
```

For an API smoke test against the configured database, the following creates
two temporary shops, tests category filtering, import isolation, duplicate
skips, and setup completion, then removes only those fixture records:

```sh
node --import tsx scripts/verify-shop-catalog.ts
```

Use `--keep` only for browser inspection, followed by `--cleanup`. Cleanup
verifies each fixture's exact ID, name and dummy phone, and refuses to remove
a fixture containing saved bills. `RETLEX_TEST_URL` overrides the default
`http://127.0.0.1:3000`. No existing shop data is modified by this smoke test.

If the local Turbopack process fails while processing CSS, the verified preview
command is `npm run dev -- --webpack --hostname 127.0.0.1 --port 3000`.
