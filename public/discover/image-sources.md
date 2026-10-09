# Retlex discover demo — photo sources

Real photographs are used as illustrative assets in the concept demo. Shop identities, ratings, inventory, prices and distances are fictional. Storefront photographs do not imply that the photographed businesses participate in Retlex. Original photographs and trademarks belong to their respective owners; no license transfer is implied by this source list.

## Product photographs

- `amul.jpg`: [Amul Taaza 500 ml — BigBasket](https://www.bigbasket.com/pd/40090894/amul-taaza-500-ml-pouch/)
- `sanchi.jpg`: [Sanchi Taaza 500 ml — Blinkit](https://blinkit.com/prn/sanchi-taaza-fresh-milk/prid/693236)
- `bread-200.png`: [Britannia brown bread 200 g — MyStore](https://www.mystore.in/en/product/britannia-brown-bread-200-gm-pouch)
- `bread-400.png`: [Britannia brown bread 400 g — MyStore](https://www.mystore.in/en/product/britannia-brown-bread-400-gm-pack)
- `shirt-cotton.jpg`: [White long-sleeve shirt — Henry & Gray](https://www.henryandgray.co.nz/products/mens-white-long-sleeve-shirt)
- `shirt-oxford.jpg`: [George white dress shirt — Walmart](https://www.walmart.com/ip/409934092)
- `shirt-essential.jpg`: [White formal shirt — Himanshi Garments / TradeIndia](https://www.tradeindia.com/products/fancy-look-plain-full-sleeves-pure-cotton-mens-formal-white-shirt-7848310.html)
- `shirt-casual.jpg`: [Espionage white shirt — XXLargedirect](https://www.xxlargedirect.com/espionage-plain-white-ls-plain-collar-shirt-sh151-2431-1-p.asp)
- `shirt-textured.jpg`: [Greiff white shirt — Arbeitsmoden](https://www.arbeitsmoden.de/herren-hemd-in-weiss-regular-fit-13952.html)
- `shirt-premium.jpg`: [Symbol white shirt — Saumyas Stores](https://saumyasstores.com/products/amazon-brand-symbol-mens-solid-cotton-formal-shirt-plain-full-sleeve-regular-fit-available-in-plus-size-white_42)

Shirt photos illustrate the fictional demo listings; their source brands, fabrics, sizes and prices are not claims about available Retlex inventory.

## Indian storefront photographs

- `shop-fashion-1.webp`: [70MM, Arumbakkam, Chennai — Whereitz](https://whereitz.com/store/info/20197)
- `shop-fashion-2.webp`: [Mens Spot storefront, Kodungaiyur, Chennai — Whereitz](https://whereitz.com/chennai/seven-dresses-in-kodungaiyur?id=20060)
- `shop-fashion-3.jpg`: [P.K Men's Wear, Bangalore — Whereitz](https://www.whereitz.com/bangalore/pk-mens-wear-in-byatarayanapura?id=5530)
- `shop-grocery-1.jpeg`: [Sri Sai Kirana, Beeramguda — RealEstateIndia](https://www.realestateindia.com/property-detail/commercial-shops-for-rent-in-beeramguda-hyderabad-208-sq-ft-5-500-1152520.htm)
- `shop-grocery-2.webp`: [Sachdeva Kiryana, Fatehabad — Yappe](https://yappe.in/haryana/fatehabad/sachdeva-kiryana-pansari-store/190471)
- `shop-grocery-3.jpg`: [Lavanya Kirana General Store, Secunderabad — Zone Adds](https://www.zoneadds.com/Business/Lavanya-Kirana-General-Store/6281)

All assets are served locally from `/discover/` to avoid dependence on third-party image requests during a presentation.

## Illustrated map backdrop

- Final asset: `public/discover/neighbourhood-map.webp` (308 KB). Generated with the built-in image generation tool in **generate** mode, then compressed to WebP with the existing Sharp dependency.
- This depicts fictional geography, rather than real map tiles. Interactive shop pins are HTML controls placed over the image. The interface labels the map and shop locations as illustrative/simulated.
- The original generated PNG is retained by Codex; the optimized project asset is served locally.

Final generation prompt:

```text
Use case: ui-mockup. Asset type: a standalone 1536x1024 street-map background image for a nearby shop discovery app. Create a highly realistic, clean top-down 2D digital street map of a fictional dense Bengaluru-style neighbourhood, like a polished modern navigation map. Show many small believable city blocks, parcel/building footprints in warm pale grey, a connected hierarchy of winding residential lanes and white roads with fine grey outlines, one broad soft-yellow arterial road winding diagonally through the neighbourhood, intersections and some cul-de-sacs. Two small muted green parks and one small pale-blue lake near an edge. It should look like practical map tiles at neighbourhood zoom, geographically plausible urban cartography, flat and crisp with restrained detail, not a decorative illustrated scene. Colors: off-white background, light beige-grey building blocks, white streets, very soft amber main road, pale sage-green parks. Composition: edge-to-edge landscape map, consistent close neighbourhood zoom, equally detailed across the frame. No app UI, no border, no search bars, no pins, no routes, no circles, no text, no numbers, no labels, no logos, no watermark. This will be labeled illustrative in the app. Avoid 3D, isometric buildings, satellite photography, artistic texture, cartoon blocks, excessive contrast. Deliver only the map image.
```
