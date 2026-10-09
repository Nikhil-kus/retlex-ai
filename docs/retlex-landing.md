# Retlex public landing experience

The public page is `/discover`. The root `/` retains the existing shop lookup, returning-user redirect and shop setup. Live-billing links enter through `/`. This redesign changes only the public frontend; Firebase, authentication, inventory endpoints and operational billing are preserved.

## Compact page structure

1. One hero search with two examples and an integrated discovery demo. Shirt results display three choices initially, with an optional expansion to all six. Real Indian clothing-store photographs accompany the products. Grocery search opens three stores and their four-item catalogs. Sorting, sample stock and retailer filtering remain functional.
2. A short working-product introduction with the Hindi voice-billing preview and live billing link. It explains that digitized inventory is the foundation for future discovery.
3. Founder email and LinkedIn in the footer.

Repeated product previews, long feature grids, separate problem/technology sections, milestones and the extra final CTA were removed to make the page easier to scan.

## Implementation

- `src/app/discover/Discover.tsx`: search, optional existing browser speech recognition, clickable suggestions, products, map/store selection, billing preview and contact.
- `src/app/discover/discover.module.css`: scoped ivory/ink/orange styling, mobile layouts, focus states and reduced motion. The page owns its scrolling to fit the operational app's root layout.
- `src/app/discover/demo-data.ts`: deterministic simulated fixtures; no production inventory reads or writes.
- `src/app/discover/landing-content.ts`: founder-provided contact and editable verified development details. Milestones are retained as content configuration but are no longer displayed. An optional `NEXT_PUBLIC_RETLEX_FOUNDER_CONTACT_URL` can override the email link.
- `page.tsx`, `layout.tsx`, `opengraph-image.tsx`: public metadata, canonical URL, social preview and theme. Existing public favicon preserved.

## Images and disclosure

The street map is a locally served generated raster image, with interactive HTML shop pins. It depicts fictional geography. The interface explicitly labels map locations, prices, inventory and retailers as simulated; storefront photos are representative rather than claims of retailer participation.

The optimized map lives at `public/discover/neighbourhood-map.webp`. Its generation mode and final prompt, plus existing photo sources, are recorded in `public/discover/image-sources.md`. All images use Next.js image optimization and require no decorative external API requests.

## Verification

Use `npm run test:discover`, `node node_modules/typescript/bin/tsc --noEmit` and `npm run build`. Next.js is configured to skip type validation during build, so the separate type check matters. Browser QA covers mobile, tablet and desktop, both demo searches, catalogs, price/distance sorting, result expansion, map selection, navigation, image loading, focus and contrast.

Speech search starts only after a microphone click and retains fallback messages for unavailable support, permission denial, silence and timeout. Recognition requires browser support and permission; clickable suggestions always work.

## Production data still needed

Actual discovery requires verified retailer participation, real store coordinates, connected catalogs, current prices and reliable inventory freshness. Keep sample labels until these exist. Add adoption figures, interviews or testimonials only after verification. Confirm usage rights for the representative photographs or replace them with owned/licensed assets before production marketing.
