/**
 * Uses Gemini to find image URLs for pooja products,
 * then updates Firestore with the best available image.
 * Falls back to verified working product image URLs.
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
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
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchSafe(url, opts = {}, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(t);
    return r;
  } catch { clearTimeout(t); return null; }
}

async function geminiImageUrl(productName) {
  if (!GEMINI_KEY) return null;
  const prompt = `Find a real, working direct image URL (ending in .jpg or .png) for this Indian product: "${productName}". 
The image should be from a reliable source like bigbasket.com, amazon.in, flipkart.com, or any Indian e-commerce site.
Reply with ONLY the URL, nothing else. If you cannot find a real URL, reply with "null".`;

  const res = await fetchSafe(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    },
    15000
  );
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
    if (!text || text === 'null' || !text.startsWith('http')) return null;
    // Extract URL if there's extra text
    const match = text.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png)/i);
    return match ? match[0] : null;
  } catch { return null; }
}

async function verifyImageUrl(url) {
  if (!url) return false;
  const res = await fetchSafe(url, { method: 'HEAD' }, 8000);
  return res?.ok && (res.headers.get('content-type') || '').startsWith('image/');
}

// Pooja product names that need images
const POOJA_PRODUCTS = [
  'Gugal Havan Pooja 50g',
  'Gulal Pooja Red',
  'Pureasia Malika Dhoop Sticks 100g',
  'Ayodhya 2in1 Premium Incense Sticks',
  'Pure Shringar Bambooless Agarbatti',
  'Cycle Brand Naivedya Sambrani 12 Cups',
  'Forest Natural Loban Bathi',
  'Bhasm Pooja',
  'Pooja Path Agarbatti',
  'Pureasia Bakhoor Dhoop Sticks 100g x 6',
  'Siddhi Kasturi Wet Dhoop Sticks',
  'Gayatri Camphor Pure',
  'Pureasia OUD Dhoop Sticks',
  'Attar Mogra Ward',
  'Guggal MK 25g',
  'Jai Ambaji Abeel',
  'Gulab Ward Rose Attar',
  'Siddhi Sandal Wet Dhoop Sticks 10pcs',
  'Sanjeevani Moli Sacred Thread',
  'Basant Bahar Ram Bhumi Agarbatti 70g',
  'Pureasia Fantasy Dhoop Sticks 100g x 6',
  'Chandan Powder Pooja',
  'Forest Sandal Premium Incense Sticks',
  'Tridev 3in1 Premium Incense Sticks',
  'Hari Darshan Camphor Incense Cones',
  'Kashi Tulsi Ashtagandha Chandan Tika',
];

async function main() {
  console.log('🔍 Fetching pooja products from Firestore...\n');
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', SHOP_ID)));
  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => POOJA_PRODUCTS.includes(p.name) && !p.imageUrl);

  console.log(`Found ${products.length} pooja products needing images\n`);

  let updated = 0, failed = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    console.log(`[${i + 1}/${products.length}] ${p.name}`);

    // Ask Gemini for image URL
    const geminiUrl = await geminiImageUrl(p.name);
    console.log(`   🤖 Gemini suggested: ${geminiUrl || 'null'}`);

    let finalUrl = null;

    if (geminiUrl) {
      const valid = await verifyImageUrl(geminiUrl);
      if (valid) {
        finalUrl = geminiUrl;
        console.log(`   ✅ Verified URL works`);
      } else {
        console.log(`   ⚠️  URL not accessible, trying Bing...`);
        // Try Bing as fallback
        const bingRes = await fetchSafe(
          `https://www.bing.com/images/search?q=${encodeURIComponent(p.name + ' India product')}&form=HDRSC2&first=1`
        );
        if (bingRes?.ok) {
          const html = await bingRes.text();
          const murls = [...html.matchAll(/"murl":"(https?:[^"]+\.(?:jpg|jpeg|png))"/gi)];
          for (const m of murls.slice(0, 5)) {
            const url = decodeURIComponent(m[1]);
            if (!url.includes('logo') && !url.includes('icon')) {
              finalUrl = url;
              console.log(`   🔍 Bing fallback: ${url.slice(0, 60)}…`);
              break;
            }
          }
        }
      }
    }

    if (finalUrl) {
      await updateDoc(doc(db, 'products', p.id), { imageUrl: finalUrl });
      console.log(`   💾 Saved to Firestore\n`);
      updated++;
    } else {
      console.log(`   ❌ No valid image found\n`);
      failed++;
    }

    await sleep(1000); // Rate limit Gemini
  }

  console.log(`\n✅ Updated: ${updated}  ❌ Failed: ${failed}`);
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
