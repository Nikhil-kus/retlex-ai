import { KIRANA_PRODUCTS } from './kirana-catalog';
import type { CatalogScope } from './shop-types';
import photoCredits from '../../public/catalog-images/credits.json';

export interface CatalogItem {
  id: string;
  name: string;
  localName: string | null;
  localAliases: string[];
  price: number;
  costPrice: number;
  baseUnit: string;
  baseQuantity: number;
  packetWeight: number | null;
  packetUnit: string | null;
  barcode: string | null;
  category: string | null;
  imageUrl: string | null;
  shopType: CatalogScope;
  imageCredit?: { author: string; license: string; licenseUrl: string; sourceUrl: string };
}

// Illustrative starting rates in INR. Owners review and edit these before billing.
// Tent rates are per item per event; this does not implement rental scheduling.
type Seed = [slug: string, name: string, hindi: string, category: string, price: number, search: string, aliases: string];
export const PHOTO_SEEDS: Record<'tent' | 'electronics' | 'universal', Seed[]> = {
  tent: [
    ['marquee', 'Marquee Tent', 'शामियाना टेंट', 'Tents & Coverings', 2500, 'marquee tent', 'shamiyana,pandal,tent'],
    ['plastic-chair', 'Plastic Chair', 'प्लास्टिक कुर्सी', 'Chairs & Tables', 10, 'plastic chair', 'kursi,chair'],
    ['folding-table', 'Folding Table', 'फोल्डिंग टेबल', 'Chairs & Tables', 100, 'folding table', 'table,mez'],
    ['tablecloth', 'Tablecloth', 'मेज़पोश', 'Linen & Furnishings', 30, 'tablecloth', 'mezposh,table cover'],
    ['carpet', 'Event Carpet', 'कालीन', 'Linen & Furnishings', 200, 'red carpet roll', 'kaleen,dari,carpet'],
    ['mattress', 'Mattress', 'गद्दा', 'Linen & Furnishings', 50, 'mattress', 'gadda,bistar'],
    ['cushion', 'Cushion', 'तकिया', 'Linen & Furnishings', 15, 'cushion pillow', 'takiya,pillow'],
    ['steel-plate', 'Steel Dinner Plate', 'स्टील थाली', 'Catering & Utensils', 5, 'stainless steel plate thali', 'thali,plate'],
    ['spoon', 'Steel Spoon', 'स्टील चम्मच', 'Catering & Utensils', 2, 'stainless steel spoon', 'chammach,spoon'],
    ['water-jug', 'Water Jug', 'पानी का जग', 'Catering & Utensils', 20, 'water jug', 'jug,jag'],
    ['chafing-dish', 'Chafing Dish', 'बुफे डिश', 'Catering & Utensils', 250, 'chafing dish', 'buffet dish,food warmer'],
    ['cooking-pot', 'Large Cooking Pot', 'बड़ा भगोना', 'Catering & Utensils', 100, 'stock pot cooking', 'bhagona,patila,deg'],
  ],
  electronics: [
    ['led-bulb', 'LED Bulb 9W', 'एलईडी बल्ब', 'Lighting', 100, 'LED light bulb', 'bulb,led,balb'],
    ['tube-light', 'LED Tube Light', 'एलईडी ट्यूबलाइट', 'Lighting', 250, 'LED tube light', 'tubelight,tube light'],
    ['ceiling-fan', 'Ceiling Fan', 'सीलिंग पंखा', 'Fans & Appliances', 1600, 'ceiling fan', 'pankha,ceiling fan'],
    ['pedestal-fan', 'Pedestal Fan', 'स्टैंड पंखा', 'Fans & Appliances', 2200, 'pedestal fan', 'stand fan,pankha'],
    ['electric-iron', 'Electric Iron', 'इलेक्ट्रिक प्रेस', 'Fans & Appliances', 700, 'electric clothes iron', 'press,istri,iron'],
    ['electric-kettle', 'Electric Kettle', 'इलेक्ट्रिक केतली', 'Fans & Appliances', 900, 'electric kettle', 'ketli,kettle'],
    ['extension-board', 'Extension Board', 'एक्सटेंशन बोर्ड', 'Wiring & Fittings', 300, 'power strip', 'extension board,multiplug'],
    ['switch', 'Electrical Switch', 'बिजली स्विच', 'Wiring & Fittings', 40, 'light switch', 'switch,bijli switch'],
    ['socket', 'Power Socket', 'पावर सॉकेट', 'Wiring & Fittings', 80, 'electrical socket India', 'socket,plug socket'],
    ['wire', 'Electrical Wire Roll', 'बिजली तार रोल', 'Wiring & Fittings', 900, 'electrical wire coil', 'tar,wire,cable roll'],
    ['charger', 'USB Wall Charger', 'मोबाइल चार्जर', 'Mobile & Audio Accessories', 250, 'USB wall charger', 'charger,mobile charger'],
    ['usb-cable', 'USB-C Cable', 'यूएसबी केबल', 'Mobile & Audio Accessories', 150, 'USB C cable', 'data cable,usb,type c'],
    ['headphones', 'Headphones', 'हेडफोन', 'Mobile & Audio Accessories', 600, 'headphones', 'headphone,headset'],
    ['speaker', 'Bluetooth Speaker', 'ब्लूटूथ स्पीकर', 'Mobile & Audio Accessories', 1000, 'bluetooth speaker', 'speaker,bluetooth'],
    ['power-bank', 'Power Bank', 'पावर बैंक', 'Mobile & Audio Accessories', 1200, 'power bank', 'powerbank,power bank'],
    ['torch', 'LED Torch', 'एलईडी टॉर्च', 'Lighting', 200, 'LED flashlight', 'torch,flashlight'],
  ],
  universal: [
    ['paper-bag', 'Paper Carry Bag', 'कागज़ का थैला', 'Universal · Packaging', 10, 'paper shopping bag', 'carry bag,thaila,paper bag'],
    ['packing-tape', 'Packing Tape', 'पैकिंग टेप', 'Universal · Packaging', 40, 'packing tape roll', 'tape,packing tape'],
    ['rope', 'Utility Rope', 'रस्सी', 'Universal · Essentials', 50, 'coil rope', 'rassi,rope'],
    ['pen', 'Ballpoint Pen', 'बॉल पेन', 'Universal · Stationery', 10, 'ballpoint pen', 'pen,kalam'],
    ['notebook', 'Notebook', 'कॉपी', 'Universal · Stationery', 40, 'notebook stationery', 'copy,notebook,register'],
    ['scissors', 'Scissors', 'कैंची', 'Universal · Stationery', 60, 'scissors', 'kainchi,scissor'],
    ['batteries', 'AA Battery Pair', 'एए बैटरी जोड़ी', 'Universal · Essentials', 40, 'AA batteries', 'cell,battery,batteries'],
    ['bucket', 'Plastic Bucket', 'प्लास्टिक बाल्टी', 'Universal · Essentials', 120, 'plastic bucket', 'balti,bucket'],
  ],
};

const newProducts: CatalogItem[] = Object.entries(PHOTO_SEEDS).flatMap(([scope, seeds]) =>
  seeds.map(([slug, name, localName, category, price, , aliases]) => ({
    id: `starter_${scope}_${slug}`, name, localName, category, price,
    localAliases: aliases.split(','), costPrice: 0, baseUnit: 'pc', baseQuantity: 1,
    packetWeight: null, packetUnit: null, barcode: null,
    shopType: scope as CatalogScope, imageUrl: `/catalog-images/${scope}-${slug}.jpg`,
    imageCredit: (photoCredits as Record<string, CatalogItem['imageCredit']>)[`${scope}-${slug}.jpg`],
  }))
);

export const STARTER_CATALOG: CatalogItem[] = [
  ...KIRANA_PRODUCTS.map((p, index): CatalogItem => ({
    id: `starter_kirana_${index}`, name: p.name, localName: p.localName,
    localAliases: p.aliases, price: p.price, costPrice: 0, baseUnit: p.unit,
    baseQuantity: p.baseQuantity, packetWeight: null, packetUnit: null,
    barcode: null, category: 'Kirana Essentials', imageUrl: p.imageUrl, shopType: 'kirana',
  })),
  ...newProducts,
];
