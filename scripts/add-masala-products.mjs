/**
 * Adds masala products for Catch, Everest, Pushp, Suhana brands
 * to "Shri krishna kirana and general Store." (ID: Yvgf5Us3pdNGHa0ljBGr)
 *
 * Variants based on:
 * - Images provided (shelf photos showing actual stock)
 * - All common market variants for each brand
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

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

// ── Image search helpers ──────────────────────────────────────────────────────
async function fetchSafe(url, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    clearTimeout(t); return r;
  } catch { clearTimeout(t); return null; }
}

async function searchOpenFoodFacts(name) {
  const res = await fetchSafe(
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,image_front_url`
  );
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    const kw = name.split(' ')[0].toLowerCase();
    const products = data.products || [];
    const hit = products.find(p => p.image_front_url && (p.product_name || '').toLowerCase().includes(kw))
             || products.find(p => p.image_front_url);
    return hit?.image_front_url || null;
  } catch { return null; }
}

async function searchFlipkart(q) {
  const res = await fetchSafe(`https://www.flipkart.com/search?q=${encodeURIComponent(q)}`);
  if (!res?.ok) return null;
  try {
    const html = await res.text();
    const matches = [...html.matchAll(/https?:\/\/rukminim\d+\.flixcart\.com\/image\/\d+\/\d+\/[^"'\s]+\.(?:jpg|jpeg|png)/gi)];
    return matches[0]?.[0] || null;
  } catch { return null; }
}

async function findImage(name) {
  let img = await searchOpenFoodFacts(name);
  if (img) return img;
  img = await searchFlipkart(name + ' masala India');
  return img || null;
}

// ── Product definitions ───────────────────────────────────────────────────────
// Format: { name, localName, price, weight, category }
// weight = packet weight in grams

const CATCH_MASALAS = [
  // Seen directly in images
  { name: 'Catch Kashmiri Mirch Powder 100g',    localName: 'कैच कश्मीरी मिर्च पाउडर',    price: 0,  weight: 100 },
  { name: 'Catch Chatpata Chat Masala 100g',      localName: 'कैच चटपटा चाट मसाला',         price: 0,  weight: 100 },
  { name: 'Catch Chhole Masala 100g',             localName: 'कैच छोले मसाला',               price: 0,  weight: 100 },
  { name: 'Catch Raita Masala 100g',              localName: 'कैच रायता मसाला',              price: 0,  weight: 100 },
  { name: 'Catch Kitchen King Masala 100g',       localName: 'कैच किचन किंग मसाला',          price: 0,  weight: 100 },
  { name: 'Catch Jaljeera 100g',                  localName: 'कैच जलजीरा',                   price: 0,  weight: 100 },
  { name: 'Catch Kali Mirch Powder 50g',          localName: 'कैच काली मिर्च पाउडर',         price: 0,  weight: 50  },
  { name: 'Catch Raita Dahivada Masala 100g',     localName: 'कैच रायता दहीवड़ा मसाला',       price: 0,  weight: 100 },
  // Additional common Catch variants
  { name: 'Catch Garam Masala 100g',              localName: 'कैच गरम मसाला',                price: 0,  weight: 100 },
  { name: 'Catch Coriander Powder 100g',          localName: 'कैच धनिया पाउडर',              price: 0,  weight: 100 },
  { name: 'Catch Turmeric Powder 100g',           localName: 'कैच हल्दी पाउडर',              price: 0,  weight: 100 },
  { name: 'Catch Red Chilli Powder 100g',         localName: 'कैच लाल मिर्च पाउडर',          price: 0,  weight: 100 },
  { name: 'Catch Pav Bhaji Masala 100g',          localName: 'कैच पाव भाजी मसाला',           price: 0,  weight: 100 },
  { name: 'Catch Biryani Masala 100g',            localName: 'कैच बिरयानी मसाला',            price: 0,  weight: 100 },
  { name: 'Catch Chicken Masala 100g',            localName: 'कैच चिकन मसाला',               price: 0,  weight: 100 },
  { name: 'Catch Meat Masala 100g',               localName: 'कैच मीट मसाला',                price: 0,  weight: 100 },
  { name: 'Catch Sambhar Masala 100g',            localName: 'कैच सांभर मसाला',              price: 0,  weight: 100 },
  { name: 'Catch Pani Puri Masala 100g',          localName: 'कैच पानी पूरी मसाला',          price: 0,  weight: 100 },
  { name: 'Catch Sabji Masala 100g',              localName: 'कैच सब्जी मसाला',              price: 0,  weight: 100 },
  { name: 'Catch Rajma Masala 100g',              localName: 'कैच राजमा मसाला',              price: 0,  weight: 100 },
  { name: 'Catch Mango Powder Amchur 100g',       localName: 'कैच आमचूर पाउडर',              price: 0,  weight: 100 },
  { name: 'Catch Cumin Powder Jeera 100g',        localName: 'कैच जीरा पाउडर',               price: 0,  weight: 100 },
  { name: 'Catch Salt 1kg',                       localName: 'कैच नमक',                      price: 0,  weight: 1000 },
];

const EVEREST_MASALAS = [
  // Seen directly in images
  { name: 'Everest Kashmirilal Chilli Powder 100g', localName: 'एवरेस्ट कश्मीरीलाल मिर्च',   price: 0,  weight: 100 },
  { name: 'Everest Chhole Masala 100g',             localName: 'एवरेस्ट छोले मसाला',          price: 0,  weight: 100 },
  { name: 'Everest Garam Masala 100g',              localName: 'एवरेस्ट गरम मसाला',           price: 0,  weight: 100 },
  { name: 'Everest Sambhar Masala 100g',            localName: 'एवरेस्ट सांभर मसाला',         price: 0,  weight: 100 },
  { name: 'Everest Chaat Masala 100g',              localName: 'एवरेस्ट चाट मसाला',           price: 0,  weight: 100 },
  { name: 'Everest Raita Dahivada Masala 50g',      localName: 'एवरेस्ट रायता दहीवड़ा मसाला',  price: 0,  weight: 50  },
  { name: 'Everest Kitchen King Masala 100g',       localName: 'एवरेस्ट किचन किंग मसाला',     price: 0,  weight: 100 },
  { name: 'Everest Pani Puri Masala 100g',          localName: 'एवरेस्ट पानी पूरी मसाला',     price: 0,  weight: 100 },
  { name: 'Everest Sabji Masala 100g',              localName: 'एवरेस्ट सब्जी मसाला',         price: 0,  weight: 100 },
  // Additional common Everest variants
  { name: 'Everest Tikhalal Chilli Powder 100g',    localName: 'एवरेस्ट तीखालाल मिर्च पाउडर', price: 0,  weight: 100 },
  { name: 'Everest Turmeric Powder 100g',           localName: 'एवरेस्ट हल्दी पाउडर',         price: 0,  weight: 100 },
  { name: 'Everest Coriander Powder 100g',          localName: 'एवरेस्ट धनिया पाउडर',         price: 0,  weight: 100 },
  { name: 'Everest Biryani Masala 50g',             localName: 'एवरेस्ट बिरयानी मसाला',       price: 0,  weight: 50  },
  { name: 'Everest Chicken Masala 100g',            localName: 'एवरेस्ट चिकन मसाला',          price: 0,  weight: 100 },
  { name: 'Everest Meat Masala 100g',               localName: 'एवरेस्ट मीट मसाला',           price: 0,  weight: 100 },
  { name: 'Everest Pav Bhaji Masala 100g',          localName: 'एवरेस्ट पाव भाजी मसाला',      price: 0,  weight: 100 },
  { name: 'Everest Rajma Masala 100g',              localName: 'एवरेस्ट राजमा मसाला',         price: 0,  weight: 100 },
  { name: 'Everest Fish Curry Masala 100g',         localName: 'एवरेस्ट फिश करी मसाला',       price: 0,  weight: 100 },
  { name: 'Everest Shahi Biryani Masala 50g',       localName: 'एवरेस्ट शाही बिरयानी मसाला',  price: 0,  weight: 50  },
  { name: 'Everest Tea Masala 50g',                 localName: 'एवरेस्ट चाय मसाला',           price: 0,  weight: 50  },
  { name: 'Everest Cumin Powder 100g',              localName: 'एवरेस्ट जीरा पाउडर',          price: 0,  weight: 100 },
  { name: 'Everest Mango Powder Amchur 100g',       localName: 'एवरेस्ट आमचूर पाउडर',         price: 0,  weight: 100 },
];

const PUSHP_MASALAS = [
  // Seen directly in images
  { name: 'Pushp Chat Masala 200g',                 localName: 'पुष्प चाट मसाला',             price: 0,  weight: 200 },
  { name: 'Pushp Sambhar Masala 100g',              localName: 'पुष्प सांभर मसाला',           price: 0,  weight: 100 },
  { name: 'Pushp Sabji Masala 100g',                localName: 'पुष्प सब्जी मसाला',           price: 0,  weight: 100 },
  // Additional common Pushp variants
  { name: 'Pushp Garam Masala 100g',                localName: 'पुष्प गरम मसाला',             price: 0,  weight: 100 },
  { name: 'Pushp Coriander Powder 500g',            localName: 'पुष्प धनिया पाउडर',           price: 0,  weight: 500 },
  { name: 'Pushp Turmeric Powder 500g',             localName: 'पुष्प हल्दी पाउडर',           price: 0,  weight: 500 },
  { name: 'Pushp Red Chilli Powder 500g',           localName: 'पुष्प लाल मिर्च पाउडर',       price: 0,  weight: 500 },
  { name: 'Pushp Pav Bhaji Masala 100g',            localName: 'पुष्प पाव भाजी मसाला',        price: 0,  weight: 100 },
  { name: 'Pushp Biryani Masala 100g',              localName: 'पुष्प बिरयानी मसाला',         price: 0,  weight: 100 },
  { name: 'Pushp Chicken Masala 100g',              localName: 'पुष्प चिकन मसाला',            price: 0,  weight: 100 },
  { name: 'Pushp Meat Masala 100g',                 localName: 'पुष्प मीट मसाला',             price: 0,  weight: 100 },
  { name: 'Pushp Kitchen King Masala 100g',         localName: 'पुष्प किचन किंग मसाला',       price: 0,  weight: 100 },
  { name: 'Pushp Jal Jeera Masala 100g',            localName: 'पुष्प जल जीरा मसाला',         price: 0,  weight: 100 },
  { name: 'Pushp Pani Puri Masala 100g',            localName: 'पुष्प पानी पूरी मसाला',       price: 0,  weight: 100 },
  { name: 'Pushp Rajma Masala 100g',                localName: 'पुष्प राजमा मसाला',           price: 0,  weight: 100 },
  { name: 'Pushp Chhole Masala 100g',               localName: 'पुष्प छोले मसाला',            price: 0,  weight: 100 },
];

const SUHANA_MASALAS = [
  // Seen directly in images
  { name: 'Suhana Pav Bhaji Masala 50g',            localName: 'सुहाना पाव भाजी मसाला',       price: 0,  weight: 50  },
  { name: 'Suhana Chicken Masala 50g',              localName: 'सुहाना चिकन मसाला',           price: 0,  weight: 50  },
  { name: 'Suhana Mutton Gravy Mix 50g',            localName: 'सुहाना मटन ग्रेवी मिक्स',     price: 0,  weight: 50  },
  // Essential Suhana variants
  { name: 'Suhana Biryani Masala 50g',              localName: 'सुहाना बिरयानी मसाला',        price: 0,  weight: 50  },
  { name: 'Suhana Chhole Masala 50g',               localName: 'सुहाना छोले मसाला',           price: 0,  weight: 50  },
  { name: 'Suhana Garam Masala 50g',                localName: 'सुहाना गरम मसाला',            price: 0,  weight: 50  },
  { name: 'Suhana Sambhar Masala 50g',              localName: 'सुहाना सांभर मसाला',          price: 0,  weight: 50  },
  { name: 'Suhana Kitchen King Masala 50g',         localName: 'सुहाना किचन किंग मसाला',      price: 0,  weight: 50  },
  { name: 'Suhana Rajma Masala 50g',                localName: 'सुहाना राजमा मसाला',          price: 0,  weight: 50  },
  { name: 'Suhana Fish Curry Masala 50g',           localName: 'सुहाना फिश करी मसाला',        price: 0,  weight: 50  },
  { name: 'Suhana Paneer Masala 50g',               localName: 'सुहाना पनीर मसाला',           price: 0,  weight: 50  },
  { name: 'Suhana Dal Makhani Masala 50g',          localName: 'सुहाना दाल मखनी मसाला',       price: 0,  weight: 50  },
];

const ALL_PRODUCTS = [
  ...CATCH_MASALAS.map(p => ({ ...p, brand: 'Catch' })),
  ...EVEREST_MASALAS.map(p => ({ ...p, brand: 'Everest' })),
  ...PUSHP_MASALAS.map(p => ({ ...p, brand: 'Pushp' })),
  ...SUHANA_MASALAS.map(p => ({ ...p, brand: 'Suhana' })),
];

async function main() {
  // Get existing product names to avoid duplicates
  console.log('🔍 Checking existing products...');
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', SHOP_ID)));
  const existingNames = new Set(snap.docs.map(d => d.data().name?.toLowerCase()));
  console.log(`   ${existingNames.size} products already in shop\n`);

  const toAdd = ALL_PRODUCTS.filter(p => !existingNames.has(p.name.toLowerCase()));
  console.log(`🌶️  Adding ${toAdd.length} masala products (${ALL_PRODUCTS.length - toAdd.length} already exist)\n`);

  let added = 0, skipped = 0, failed = 0;

  for (let i = 0; i < toAdd.length; i++) {
    const p = toAdd[i];
    process.stdout.write(`[${i + 1}/${toAdd.length}] ${p.name} — searching image... `);

    const imgUrl = await findImage(p.name);
    if (imgUrl) process.stdout.write(`✅\n`);
    else process.stdout.write(`⚠️ no image\n`);

    const product = {
      name: p.name,
      localName: p.localName || null,
      barcode: null,
      price: p.price || 0,
      costPrice: 0,
      baseUnit: 'pc',
      baseQuantity: 1,
      packetWeight: p.weight || null,
      packetUnit: p.weight ? 'g' : null,
      category: 'Masala & Spices',
      imageUrl: imgUrl || null,
      shopId: SHOP_ID,
    };

    try {
      await addDoc(collection(db, 'products'), product);
      added++;
    } catch (err) {
      console.error(`   ❌ Failed: ${err.message}`);
      failed++;
    }

    await sleep(400);
  }

  console.log(`\n✅ Added: ${added}  ⏭️ Skipped: ${skipped}  ❌ Failed: ${failed}`);
  console.log(`\nTotal masala variants added:`);
  console.log(`  Catch:   ${CATCH_MASALAS.length}`);
  console.log(`  Everest: ${EVEREST_MASALAS.length}`);
  console.log(`  Pushp:   ${PUSHP_MASALAS.length}`);
  console.log(`  Suhana:  ${SUHANA_MASALAS.length}`);
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
