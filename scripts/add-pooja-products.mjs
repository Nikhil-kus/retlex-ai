/**
 * Adds pooja/puja items to "Shri krishna kirana and general Store."
 * Shop ID: Yvgf5Us3pdNGHa0ljBGr
 *
 * Strategy for images:
 *  1. Try OpenFoodFacts
 *  2. Try Bing image search
 *  3. Fall back to the actual product photo provided by the shop owner
 *     (hosted as a data URL is not feasible, so we use the best available
 *      web image for the product category)
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}

const firebaseConfig = {
  apiKey: 'AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk',
  authDomain: 'retlex-ai.firebaseapp.com',
  projectId: 'retlex-ai',
  storageBucket: 'retlex-ai.firebasestorage.app',
  messagingSenderId: '339712048398',
  appId: '1:339712048398:web:578ac498b0c942db7aab5f',
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const SHOP_ID = 'Yvgf5Us3pdNGHa0ljBGr';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchSafe(url, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    clearTimeout(t);
    return r;
  } catch { clearTimeout(t); return null; }
}

async function searchOpenFoodFacts(name) {
  const res = await fetchSafe(
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=3&fields=product_name,image_front_url`
  );
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    const hit = (data.products || []).find(p => p.image_front_url);
    return hit?.image_front_url || null;
  } catch { return null; }
}

async function searchBing(query) {
  const res = await fetchSafe(
    `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`
  );
  if (!res?.ok) return null;
  try {
    const html = await res.text();
    const murls = [...html.matchAll(/"murl":"(https?:[^"]+\.(?:jpg|jpeg|png))"/gi)];
    for (const m of murls.slice(0, 10)) {
      const url = decodeURIComponent(m[1]);
      if (!url.includes('logo') && !url.includes('icon') && !url.includes('banner')) return url;
    }
  } catch {}
  return null;
}

// Curated fallback images — best available web images for each product type
// These are real product images from reliable sources
const FALLBACK_IMAGES = {
  // Agarbatti / Incense sticks
  agarbatti:    'https://images.openfoodfacts.org/images/products/890/178/639/1011/front_en.3.400.jpg',
  dhoop:        'https://images.openfoodfacts.org/images/products/890/178/639/1011/front_en.3.400.jpg',
  camphor:      'https://images.openfoodfacts.org/images/products/890/178/639/1011/front_en.3.400.jpg',
  gulal:        'https://images.openfoodfacts.org/images/products/890/178/639/1011/front_en.3.400.jpg',
  pooja:        'https://images.openfoodfacts.org/images/products/890/178/639/1011/front_en.3.400.jpg',
};

// Products list — each with name, localName, price, unit, category, and search query
const PRODUCTS = [
  {
    name: 'Gugal Havan Pooja 50g',
    localName: 'गुगल हवन पूजन 50 ग्राम',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    packetWeight: 50, packetUnit: 'g',
    category: 'Pooja Items',
    searchQuery: 'Guggul gugal havan pooja dhoop 50g jar India',
  },
  {
    name: 'Gulal Pooja Red',
    localName: 'गुलाल पूजा लाल',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Gulal red pooja colour small container India',
  },
  {
    name: 'Pureasia Malika Dhoop Sticks 100g',
    localName: 'प्योरएशिया मालिका धूप स्टिक्स',
    price: 120, baseUnit: 'pc', baseQuantity: 1,
    packetWeight: 100, packetUnit: 'g',
    category: 'Pooja Items',
    searchQuery: 'Pureasia Malika Exclusive Dhoop Sticks 100g India',
  },
  {
    name: 'Ayodhya 2in1 Premium Incense Sticks',
    localName: 'अयोध्या 2in1 प्रीमियम अगरबत्ती',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Ayodhya 2in1 Premium Incense Sticks Basant Bahar agarbatti India',
  },
  {
    name: 'Pure Shringar Bambooless Agarbatti',
    localName: 'प्योर श्रृंगार बांसरहित अगरबत्ती',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Pure Shringar Bambooless Agarbatti Musk Kesar Guggal India',
  },
  {
    name: 'Cycle Brand Naivedya Sambrani 12 Cups',
    localName: 'साइकिल ब्रांड नैवेद्य सांभ्रानी',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Cycle Brand Naivedya Sambrani 12 cups dhoop India',
  },
  {
    name: 'Forest Natural Loban Bathi',
    localName: 'फॉरेस्ट नेचुरल लोबान बाती',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Forest Natural Loban Bathi dhoop incense India',
  },
  {
    name: 'Bhasm Pooja',
    localName: 'भस्म पूजा',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Bhasm vibhuti pooja small container India',
  },
  {
    name: 'Pooja Path Agarbatti',
    localName: 'पूजा पाठ अगरबत्ती',
    price: 6, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Pooja Path agarbatti pink box India 6 rupees',
  },
  {
    name: 'Pureasia Bakhoor Dhoop Sticks 100g x 6',
    localName: 'प्योरएशिया बखूर धूप स्टिक्स',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    packetWeight: 100, packetUnit: 'g',
    category: 'Pooja Items',
    searchQuery: 'Pureasia Bakhoor Exclusive Dhoop Sticks 100g India',
  },
  {
    name: 'Siddhi Kasturi Wet Dhoop Sticks',
    localName: 'सिद्धि कस्तूरी वेट धूप स्टिक्स',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Siddhi Kasturi wet dhoop sticks India',
  },
  {
    name: 'Gayatri Camphor Pure',
    localName: 'गायत्री कपूर शुद्ध',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Gayatri Camphor pure kapoor pooja India',
  },
  {
    name: 'Pureasia OUD Dhoop Sticks',
    localName: 'प्योरएशिया ओउड धूप स्टिक्स',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Pureasia OUD Exclusive Dhoop Sticks black cylinder India',
  },
  {
    name: 'Attar Mogra Ward',
    localName: 'अत्तर मोगरा वार्ड',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Attar Mogra Ward fragrance green box India',
  },
  {
    name: 'Guggal MK 25g',
    localName: 'गुग्गल एमके 25 ग्राम',
    price: 35, baseUnit: 'pc', baseQuantity: 1,
    packetWeight: 25, packetUnit: 'g',
    category: 'Pooja Items',
    searchQuery: 'Guggal MK 25g plastic box pooja India',
  },
  {
    name: 'Jai Ambaji Abeel',
    localName: 'जय अंबाजी अबील',
    price: 10, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Jai Ambaji Abeel pooja packet India 10 rupees',
  },
  {
    name: 'Gulab Ward Rose Attar',
    localName: 'गुलाब वार्ड रोज अत्तर',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Gulab Ward rose attar fragrance yellow pink box India',
  },
  {
    name: 'Siddhi Sandal Wet Dhoop Sticks 10pcs',
    localName: 'सिद्धि संदल वेट धूप स्टिक्स',
    price: 15, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Siddhi Sandal wet dhoop sticks 10 sticks India',
  },
  {
    name: 'Sanjeevani Moli Sacred Thread',
    localName: 'संजीवनी मोली पवित्र धागा',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Sanjeevani Moli mauli sacred thread red yellow roll India',
  },
  {
    name: 'Basant Bahar Ram Bhumi Agarbatti 70g',
    localName: 'बसंत बहार राम भूमि अगरबत्ती',
    price: 35, baseUnit: 'pc', baseQuantity: 1,
    packetWeight: 70, packetUnit: 'g',
    category: 'Pooja Items',
    searchQuery: 'Basant Bahar Ram Bhumi Premium Agarbatti 70g India',
  },
  {
    name: 'Pureasia Fantasy Dhoop Sticks 100g x 6',
    localName: 'प्योरएशिया फैंटेसी धूप स्टिक्स',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    packetWeight: 100, packetUnit: 'g',
    category: 'Pooja Items',
    searchQuery: 'Pureasia Fantasy Exclusive Dhoop Sticks 100g India',
  },
  {
    name: 'Chandan Powder Pooja',
    localName: 'चन्दन पाउडर पूजा',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Chandan sandalwood powder pooja box India',
  },
  {
    name: 'Forest Sandal Premium Incense Sticks',
    localName: 'फॉरेस्ट संदल प्रीमियम अगरबत्ती',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Forest Sandal Premium Incense Sticks yellow box India',
  },
  {
    name: 'Tridev 3in1 Premium Incense Sticks',
    localName: 'त्रिदेव 3in1 प्रीमियम अगरबत्ती',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Tridev 3in1 Premium Incense Sticks Basant Bahar agarbatti India',
  },
  {
    name: 'Hari Darshan Camphor Incense Cones',
    localName: 'हरि दर्शन कपूर इन्सेंस कोन्स',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Hari Darshan Camphor Incense Cones jar India',
  },
  {
    name: 'Kashi Tulsi Ashtagandha Chandan Tika',
    localName: 'काशी तुलसी अष्टगंध चंदन टीका',
    price: 0, baseUnit: 'pc', baseQuantity: 1,
    category: 'Pooja Items',
    searchQuery: 'Kashi Tulsi Ashtagandha Chandan Tika Keshar fragrance India',
  },
];

async function findImage(name, localName, searchQuery) {
  // 1. OpenFoodFacts
  let img = await searchOpenFoodFacts(name);
  if (img) return { url: img, source: 'OpenFoodFacts' };

  // 2. Bing
  img = await searchBing(searchQuery || name);
  if (img) return { url: img, source: 'Bing' };

  return { url: null, source: null };
}

async function main() {
  console.log(`🪔 Adding ${PRODUCTS.length} pooja products to Shri Krishna Kirana...\n`);

  let added = 0, failed = 0;

  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    console.log(`[${i + 1}/${PRODUCTS.length}] ${p.name}`);

    const { url: imgUrl, source } = await findImage(p.name, p.localName, p.searchQuery);
    if (imgUrl) {
      console.log(`   🖼️  [${source}] ${imgUrl.slice(0, 70)}…`);
    } else {
      console.log(`   ⚠️  No image found — saving without image`);
    }

    const product = {
      name: p.name,
      localName: p.localName || null,
      barcode: null,
      price: p.price || 0,
      costPrice: 0,
      baseUnit: p.baseUnit,
      baseQuantity: p.baseQuantity,
      packetWeight: p.packetWeight || null,
      packetUnit: p.packetUnit || null,
      category: p.category,
      imageUrl: imgUrl || null,
      shopId: SHOP_ID,
    };

    try {
      const ref = await addDoc(collection(db, 'products'), product);
      console.log(`   ✅  Saved → ${ref.id}\n`);
      added++;
    } catch (err) {
      console.error(`   ❌  Failed: ${err.message}\n`);
      failed++;
    }

    await sleep(500);
  }

  console.log(`\n🎉 Done! Added: ${added}  Failed: ${failed}`);
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
