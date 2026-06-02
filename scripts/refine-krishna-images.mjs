/**
 * refine-krishna-images.mjs
 * Targeted refinement of product images for Shri Krishna Kirana.
 * Uses shop-photo insights to improve matching for local and national brands.
 */

import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const firebaseConfig = {
  apiKey:            "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain:        "retlex-ai.firebaseapp.com",
  projectId:         "retlex-ai",
  storageBucket:     "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId:             "1:339712048398:web:578ac498b0c942db7aab5f",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db  = getFirestore(app);

const DELAY_MS = 1000;
const vqdCache = new Map();

async function fetchSafe(url, opts = {}, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        ...opts.headers,
      },
      ...opts,
    });
    clearTimeout(t);
    return r;
  } catch { clearTimeout(t); return null; }
}

function stripSize(name) {
  return name
    .replace(/\s*\d+\s*(g|ml|kg|l|ltr|pcs?|pc|bags?|pack|sachet|jar|tin|box|tube|micron|x\d+)\b.*/i, "")
    .replace(/\s*(single|box of \d+|small bundle|9x13.*)/i, "")
    .trim();
}

async function searchOFF(name) {
  const clean = stripSize(name);
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(clean)}&search_simple=1&action=process&json=1&page_size=3&fields=product_name,image_front_url`;
  const res = await fetchSafe(url);
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    const hit = data.products?.find(p => p.image_front_url && p.product_name?.toLowerCase().includes(clean.split(' ')[0].toLowerCase()));
    return hit?.image_front_url || null;
  } catch { return null; }
}

async function searchDDG(q) {
  try {
    let vqd = vqdCache.get(q);
    if (!vqd) {
      const page = await fetchSafe(`https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`);
      if (!page?.ok) return null;
      const html = await page.text();
      vqd = html.match(/vqd=([\d-]+)/)?.[1];
      if (!vqd) return null;
      vqdCache.set(q, vqd);
    }

    const imgRes = await fetchSafe(`https://duckduckgo.com/i.js?q=${encodeURIComponent(q)}&vqd=${vqd}&f=,,,,,&p=1`, {
      headers: { "Referer": "https://duckduckgo.com/" }
    });
    if (!imgRes?.ok) return null;
    const data = await imgRes.json();
    const results = data.results || [];
    
    // Filter for clean product shots (white background preferably)
    const best = results.find(r => 
      r.image.match(/\.(jpg|jpeg|png)$/i) && 
      !r.image.includes('logo') && 
      !r.image.includes('banner') &&
      (r.title?.toLowerCase().includes('packaging') || r.title?.toLowerCase().includes('packet'))
    );
    
    return best?.image || results[0]?.image || null;
  } catch { return null; }
}

async function main() {
  const shopId = 'Yvgf5Us3pdNGHa0ljBGr';
  const q = query(collection(db, "products"), where("shopId", "==", shopId));
  const snap = await getDocs(q);
  const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  console.log(`Refining ${products.length} products...`);

  const results = { updated: 0, skipped: 0 };

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    
    // Skip if already high quality and specific (not generic)
    if (p.imageUrl && p.imageUrl.includes('openfoodfacts.org') && !p.imageUrl.includes('front_en.3.400.jpg')) {
      // console.log(`[${i+1}/${products.length}] Skipping (Already Good): ${p.name}`);
      results.skipped++;
      continue;
    }

    console.log(`[${i+1}/${products.length}] Refining: ${p.name}`);

    let bestImg = null;
    
    // 1. Specific Mapping Overrides
    const nameLower = p.name.toLowerCase();
    if (nameLower.includes('nice namkeen')) {
      const type = nameLower.replace('nice namkeen', '').trim().split(' ')[0];
      bestImg = await searchDDG(`Nice Namkeen ${type} packaging India`);
    } else if (nameLower.includes("agrawal's 420") || nameLower.includes("420 papad")) {
      bestImg = await searchDDG(`${p.name} packaging product`);
    } else if (nameLower.includes('patanjali cow ghee')) {
      bestImg = 'https://www.patanjaliayurved.net/assets/product_images/400x300/1512456488CowGhee500ml1.png';
    }

    // 2. Open Food Facts
    if (!bestImg) {
      bestImg = await searchOFF(p.name);
    }

    // 3. DDG Search with packaging focus
    if (!bestImg) {
      const query = `${stripSize(p.name)} product packaging India`;
      bestImg = await searchDDG(query);
    }

    if (bestImg && bestImg !== p.imageUrl) {
      await updateDoc(doc(db, "products", p.id), { imageUrl: bestImg });
      console.log(`   -> Updated: ${bestImg.slice(0, 60)}...`);
      results.updated++;
    } else {
      results.skipped++;
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\nRefinement complete!`);
  console.log(`Updated: ${results.updated}`);
  console.log(`Skipped/Same: ${results.skipped}`);
  process.exit(0);
}

main().catch(console.error);
