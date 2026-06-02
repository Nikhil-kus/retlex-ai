/**
 * Adds products from the uploaded images to "Shri krishna kirana and general Store."
 * For each product, searches for a good image URL and saves it.
 * If no web image found, uses a reliable fallback CDN image.
 *
 * Shop ID: Yvgf5Us3pdNGHa0ljBGr
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
const CSE_KEY = process.env.GOOGLE_CSE_API_KEY;
const CSE_CX  = process.env.GOOGLE_CSE_CX;
const sleep   = ms => new Promise(r => setTimeout(r, ms));

async function fetchSafe(url, ms = 12000) {
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
  for (const base of ['https://world.openfoodfacts.org', 'https://in.openfoodfacts.org']) {
    const res = await fetchSafe(
      `${base}/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,image_front_url`
    );
    if (!res?.ok) continue;
    try {
      const data = await res.json();
      const kw = name.split(' ')[0].toLowerCase();
      const products = data.products || [];
      const hit = products.find(p => p.image_front_url && (p.product_name || '').toLowerCase().includes(kw))
               || products.find(p => p.image_front_url);
      if (hit?.image_front_url) return hit.image_front_url;
    } catch { continue; }
  }
  return null;
}

async function searchBing(query) {
  const res = await fetchSafe(
    `https://www.bing.com/images/search?q=${encodeURIComponent(query + ' product India')}&form=HDRSC2&first=1`
  );
  if (!res?.ok) return null;
  try {
    const html = await res.text();
    const murls = [...html.matchAll(/"murl":"(https?:[^"]+\.(?:jpg|jpeg|png))"/gi)];
    for (const m of murls.slice(0, 8)) {
      const url = decodeURIComponent(m[1]);
      if (!url.includes('logo') && !url.includes('icon') && !url.includes('banner')) return url;
    }
  } catch {}
  return null;
}

async function searchGoogleCSE(query) {
  if (!CSE_KEY || !CSE_CX) return null;
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', CSE_KEY);
  url.searchParams.set('cx', CSE_CX);
  url.searchParams.set('q', query + ' product packet');
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('num', '5');
  url.searchParams.set('imgType', 'photo');
  const res = await fetchSafe(url.toString());
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    const items = (data.items || []).filter(i => {
      const l = (i.link || '').toLowerCase();
      return !l.endsWith('.svg') && !l.endsWith('.gif');
    });
    return items[0]?.link || null;
  } catch { return null; }
}

async function findImage(name, localName, searchQuery) {
  const combined = searchQuery || [name, localName].filter(Boolean).join(' ');
  let img = null;

  img = await searchOpenFoodFacts(name);
  if (img) return { url: img, source: 'OpenFoodFacts' };

  img = await searchBing(combined);
  if (img) return { url: img, source: 'Bing' };

  img = await searchGoogleCSE(combined);
  if (img) return { url: img, source: 'GoogleCSE' };

  return { url: null, source: null };
}

// ── Product list from images ──────────────────────────────────────────────────
const PRODUCTS = [
  {
    name: 'Durga No.1 Jeera',
    localName: 'दुर्गा नं.1 जीरा',
    category: 'Spices',
    baseUnit: 'g', baseQuantity: 100, price: 0,
    searchQuery: 'Durga No.1 Jeera cumin seeds packet India',
  },
  {
    name: 'Export Quality Jeera 100% Pure',
    localName: 'एक्सपोर्ट क्वालिटी जीरा',
    category: 'Spices',
    baseUnit: 'g', baseQuantity: 100, price: 0,
    searchQuery: 'Export Quality jeera cumin seeds packet purple bag India',
  },
  {
    name: 'Shuchi Chironji Boora',
    localName: 'शुची चिरौंजी बूरा',
    category: 'Dry Fruits & Nuts',
    baseUnit: 'g', baseQuantity: 100, price: 0,
    searchQuery: 'Shuchi chironji boora packet India',
  },
  {
    name: 'Bambino Nutraawell Vermicelli',
    localName: 'बम्बिनो नुट्रावेल सेवई',
    category: 'Staples',
    baseUnit: 'pc', baseQuantity: 1, price: 0,
    packetWeight: 900, packetUnit: 'g',
    searchQuery: 'Bambino Nutraawell Vermicelli packet India',
  },
  {
    name: 'Babuji Premium Red Chilli Powder',
    localName: 'बाबूजी प्रीमियम लाल मिर्च पाउडर',
    category: 'Spices',
    baseUnit: 'pc', baseQuantity: 1, price: 0,
    searchQuery: 'Babuji Spices Premium Red Chilli Powder packet India',
  },
  {
    name: 'Homelite Safety Matches 214 Sticks',
    localName: 'होमलाइट सेफ्टी माचिस',
    category: 'Household',
    baseUnit: 'pc', baseQuantity: 1, price: 10,
    searchQuery: 'Homelite safety matches box India',
  },
  {
    name: 'Dev Gold Lal Mirchi Powder',
    localName: 'देव गोल्ड लाल मिर्ची पाउडर',
    category: 'Spices',
    baseUnit: 'pc', baseQuantity: 1, price: 0,
    searchQuery: 'Dev Gold lal mirchi powder packet India',
  },
  {
    name: 'Harsh Spices Coriander Powder 500g',
    localName: 'हर्ष स्पाइसेज धनिया पाउडर',
    category: 'Spices',
    baseUnit: 'pc', baseQuantity: 1, price: 0,
    packetWeight: 500, packetUnit: 'g',
    searchQuery: 'Harsh Spices coriander powder 500g packet India',
  },
  {
    name: 'Babuji Premium Coriander Powder',
    localName: 'बाबूजी प्रीमियम धनिया पाउडर',
    category: 'Spices',
    baseUnit: 'pc', baseQuantity: 1, price: 0,
    searchQuery: 'Babuji Spices Premium Coriander Powder packet India',
  },
  {
    name: 'Upadhyay Special Haldi Powder',
    localName: 'उपाध्याय स्पेशल हल्दी पाउडर',
    category: 'Spices',
    baseUnit: 'pc', baseQuantity: 1, price: 0,
    searchQuery: 'Upadhyay haldi turmeric powder packet India',
  },
  {
    name: 'Everest Tikhalal Red Chilli Powder',
    localName: 'एवरेस्ट तीखालाल लाल मिर्च पाउडर',
    category: 'Spices',
    baseUnit: 'pc', baseQuantity: 1, price: 0,
    searchQuery: 'Everest Tikhalal hot red chilli powder packet India',
  },
  {
    name: 'Klassic Sortex Clean Till',
    localName: 'क्लासिक सॉर्टेक्स क्लीन तिल',
    category: 'Spices',
    baseUnit: 'g', baseQuantity: 100, price: 0,
    searchQuery: 'Klassic Sortex Clean Till sesame seeds packet India',
  },
  {
    name: 'Soni Gold Arecanut Pieces',
    localName: 'सोनी गोल्ड सुपारी टुकड़े',
    category: 'Pan & Tobacco',
    baseUnit: 'pc', baseQuantity: 1, price: 0,
    searchQuery: 'Soni Gold Arecanut pieces supari packet India',
  },
  {
    name: 'Crownfield Bio Muesli Organic 500g',
    localName: 'क्राउनफील्ड बायो म्यूसली',
    category: 'Breakfast & Cereals',
    baseUnit: 'pc', baseQuantity: 1, price: 0,
    packetWeight: 500, packetUnit: 'g',
    searchQuery: 'Crownfield Bio Muesli Organic Cereals Seeds 500g',
  },
  {
    name: 'Pushp Brand Chilli Powder Patna Quality',
    localName: 'पुष्प ब्रांड मिर्च पाउडर',
    category: 'Spices',
    baseUnit: 'pc', baseQuantity: 1, price: 0,
    searchQuery: 'Pushp Brand Chilli Powder Patna Quality packet India',
  },
  {
    name: 'Chia Seeds Khula',
    localName: 'चिया सीड्स खुला',
    category: 'Dry Fruits & Nuts',
    baseUnit: 'g', baseQuantity: 100, price: 0,
    searchQuery: 'chia seeds bulk packet India',
  },
  {
    name: 'Neelam Achar Masala',
    localName: 'नीलम अचार मसाला',
    category: 'Spices',
    baseUnit: 'pc', baseQuantity: 1, price: 0,
    searchQuery: 'Neelam Achar Masala packet India',
  },
  {
    name: 'Afghan Gold Green Jeera',
    localName: 'अफगान गोल्ड ग्रीन जीरा',
    category: 'Spices',
    baseUnit: 'g', baseQuantity: 100, price: 0,
    searchQuery: 'Afghan Gold green jeera cumin packet India',
  },
  {
    name: 'Upadhyay Special Coriander Powder',
    localName: 'उपाध्याय स्पेशल धनिया पाउडर',
    category: 'Spices',
    baseUnit: 'pc', baseQuantity: 1, price: 0,
    searchQuery: 'Upadhyay coriander powder sachet India',
  },
  {
    name: 'Bhagwandas 501 Haldi Powder',
    localName: 'भागवंदास 501 हल्दी पाउडर',
    category: 'Spices',
    baseUnit: 'pc', baseQuantity: 1, price: 0,
    searchQuery: 'Bhagwandas 501 haldi turmeric powder packet India',
  },
  {
    name: 'Kamal Kishor Tambaku',
    localName: 'कमल किशोर तम्बाकू',
    category: 'Pan & Tobacco',
    baseUnit: 'pc', baseQuantity: 1, price: 0,
    searchQuery: 'Kamal Kishor tambaku tobacco packet India',
  },
  {
    name: 'Tata Sampann Vermicelli 200g',
    localName: 'टाटा सम्पन्न सेवई',
    category: 'Staples',
    baseUnit: 'pc', baseQuantity: 1, price: 0,
    packetWeight: 200, packetUnit: 'g',
    searchQuery: 'Tata Sampann Vermicelli 200g packet India',
  },
  {
    name: 'Haldiram Achar Masala',
    localName: 'हल्दीराम अचार मसाला',
    category: 'Spices',
    baseUnit: 'pc', baseQuantity: 1, price: 0,
    searchQuery: 'Haldiram Achar Masala packet India',
  },
  {
    name: 'Silver Star Citric Acid',
    localName: 'सिल्वर स्टार सिट्रिक एसिड',
    category: 'Spices',
    baseUnit: 'pc', baseQuantity: 1, price: 0,
    searchQuery: 'Silver Star Citric Acid packet India',
  },
  {
    name: 'Sukhi Adrak Khula',
    localName: 'सूखी अदरक खुला',
    category: 'Spices',
    baseUnit: 'g', baseQuantity: 100, price: 0,
    searchQuery: 'sukhi adrak dry ginger bulk India',
  },
  {
    name: 'Snello Rovagnati GranCotto',
    localName: 'स्नेलो रोवाग्नाती ग्रानकोट्टो',
    category: 'Staples',
    baseUnit: 'g', baseQuantity: 100, price: 0,
    searchQuery: 'Snello Rovagnati GranCotto product Italy',
  },
];

async function main() {
  console.log(`🏪 Adding ${PRODUCTS.length} products to Shri Krishna Kirana...\n`);

  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    console.log(`[${i + 1}/${PRODUCTS.length}] ${p.name}`);

    // Search for image
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
    } catch (err) {
      console.error(`   ❌  Failed: ${err.message}\n`);
    }

    await sleep(600);
  }

  console.log('🎉 All done!');
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
