/**
 * assign-images-krishna-photos.mjs  (v2 — DDG replaces Bing)
 * Assigns product images to Shri Krishna Kirana shop products.
 *
 * Sources (in order):
 *   1. Open Food Facts  — best for packaged Indian goods (free, no key)
 *   2. DuckDuckGo Image Search — full-res URLs via i.js API (free, no key)
 *   3. Google CSE        — API key fallback
 *
 * Run: node scripts/assign-images-krishna-photos.mjs
 */

import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ── Load .env ─────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

// ── Firebase ──────────────────────────────────────────────────────────────────
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

const DELAY_MS = 700;
const CSE_KEY  = process.env.GOOGLE_CSE_API_KEY;
const CSE_CX   = process.env.GOOGLE_CSE_CX;
const sleep    = ms => new Promise(r => setTimeout(r, ms));

// ── Fetch helper ──────────────────────────────────────────────────────────────
async function fetchSafe(url, opts = {}, ms = 13000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/json,*/*",
        "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
        ...opts.headers,
      },
      ...opts,
    });
    clearTimeout(t);
    return r;
  } catch { clearTimeout(t); return null; }
}

// ── Strip size/variant suffix for cleaner search ──────────────────────────────
function stripSize(name) {
  return name
    .replace(/\s*\d+\s*(g|ml|kg|l|ltr|pcs?|pc|bags?|pack|sachet|jar|tin|box|tube|micron|x\d+)\b.*/i, "")
    .replace(/\s*(single|box of \d+|small bundle|9x13.*)/i, "")
    .trim();
}

// ── Source 1: Open Food Facts ─────────────────────────────────────────────────
async function searchOpenFoodFacts(name) {
  const clean = stripSize(name);
  for (const base of ["https://world.openfoodfacts.org", "https://in.openfoodfacts.org"]) {
    const res = await fetchSafe(
      `${base}/cgi/search.pl?search_terms=${encodeURIComponent(clean)}&search_simple=1&action=process&json=1&page_size=6&fields=product_name,image_front_url`
    );
    if (!res?.ok) continue;
    try {
      const data = await res.json();
      const kw = clean.split(" ")[0].toLowerCase();
      const products = data.products || [];
      const hit =
        products.find(p => p.image_front_url && (p.product_name || "").toLowerCase().includes(kw)) ||
        products.find(p => p.image_front_url);
      if (hit?.image_front_url) return hit.image_front_url;
    } catch { continue; }
  }
  return null;
}

// ── Source 2: DuckDuckGo Image Search (full-res via i.js API) ────────────────
// Cache vqd tokens per query to avoid extra round-trips
const vqdCache = new Map();

async function searchDDG(searchQuery) {
  try {
    // Step 1: get vqd token (or use cached)
    let vqd = vqdCache.get(searchQuery);
    if (!vqd) {
      const page = await fetchSafe(
        `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&iax=images&ia=images`
      );
      if (!page?.ok) return null;
      const html = await page.text();
      vqd = html.match(/vqd=([\d-]+)/)?.[1];
      if (!vqd) return null;
      vqdCache.set(searchQuery, vqd);
    }

    // Step 2: call the image JSON API
    const imgRes = await fetchSafe(
      `https://duckduckgo.com/i.js?q=${encodeURIComponent(searchQuery)}&vqd=${vqd}&f=,,,,,&p=1`,
      { headers: { "Referer": "https://duckduckgo.com/" } }
    );
    if (!imgRes?.ok) return null;
    const data = await imgRes.json();
    const results = data.results || [];

    // Filter out logos, icons, banners — prefer product packaging shots
    for (const r of results.slice(0, 10)) {
      const url = r.image || "";
      if (
        url.match(/\.(jpg|jpeg|png)$/i) &&
        !url.includes("logo") &&
        !url.includes("icon") &&
        !url.includes("banner") &&
        !url.includes("sprite") &&
        !url.includes("/ad")
      ) {
        return url;
      }
    }
    // Fallback: first result with any image
    return results[0]?.image || null;
  } catch { return null; }
}

// ── Source 3: Google CSE ──────────────────────────────────────────────────────
async function searchGoogleCSE(searchQuery) {
  if (!CSE_KEY || !CSE_CX) return null;
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", CSE_KEY);
  url.searchParams.set("cx", CSE_CX);
  url.searchParams.set("q", searchQuery + " product packaging India");
  url.searchParams.set("searchType", "image");
  url.searchParams.set("num", "5");
  url.searchParams.set("imgType", "photo");
  const res = await fetchSafe(url.toString());
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    const items = (data.items || []).filter(i => {
      const l = (i.link || "").toLowerCase();
      return !l.endsWith(".svg") && !l.endsWith(".gif");
    });
    return items[0]?.link || null;
  } catch { return null; }
}

// ── Build bilingual search query ──────────────────────────────────────────────
function buildQuery(name, localName) {
  const clean = stripSize(name);
  const parts = [clean];
  if (localName) {
    const firstHindi = localName.split(" ")[0];
    if (firstHindi) parts.push(firstHindi);
  }
  if (/poly bag|pick.?up bag|hdpe|carton|bulk/i.test(name)) {
    parts.push("wholesale carton");
  }
  return parts.join(" ");
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  Shri Krishna Kirana — Image Assignment v2 (DDG + OFF + CSE)");
  console.log("=".repeat(60) + "\n");

  // Find the Krishna shop
  const shopsSnap = await getDocs(collection(db, "shops"));
  let shopId = null, shopName = "";
  for (const d of shopsSnap.docs) {
    if ((d.data().name || "").toLowerCase().includes("krishna")) {
      shopId = d.id;
      shopName = d.data().name;
      break;
    }
  }
  if (!shopId) {
    console.error("Shop not found. Run seed-krishna-from-photos.mjs first.");
    process.exit(1);
  }
  console.log("Shop: " + shopName + " (" + shopId + ")\n");

  // Fetch only products WITHOUT a valid image URL
  const snap = await getDocs(query(collection(db, "products"), where("shopId", "==", shopId)));
  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => !p.imageUrl || !p.imageUrl.startsWith("http") || p.imageUrl.includes("default"));

  console.log("Products needing images: " + products.length + "\n");

  if (products.length === 0) {
    console.log("All products already have images. Done.");
    process.exit(0);
  }

  const results = { updated: 0, failed: 0, noImage: [] };

  for (let i = 0; i < products.length; i++) {
    const { id, name, localName } = products[i];
    console.log("[" + (i + 1) + "/" + products.length + "] " + name);

    const searchQuery = buildQuery(name, localName);
    let imgUrl = null;
    let source = "";

    // 1. Open Food Facts
    imgUrl = await searchOpenFoodFacts(name);
    if (imgUrl) source = "OFF";

    // 2. DuckDuckGo (full-res image URLs)
    if (!imgUrl) {
      imgUrl = await searchDDG(searchQuery + " India");
      if (imgUrl) source = "DDG";
    }

    // 3. Google CSE fallback
    if (!imgUrl) {
      imgUrl = await searchGoogleCSE(searchQuery);
      if (imgUrl) source = "CSE";
    }

    if (!imgUrl) {
      console.log("   NO IMAGE FOUND");
      results.noImage.push(name);
      results.failed++;
      await sleep(DELAY_MS);
      continue;
    }

    await updateDoc(doc(db, "products", id), { imageUrl: imgUrl });
    console.log("   [" + source + "] " + imgUrl.slice(0, 75) + "...");
    results.updated++;
    await sleep(DELAY_MS);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Updated : " + results.updated);
  console.log("Failed  : " + results.failed);
  if (results.noImage.length > 0) {
    console.log("\nNo image found for:");
    results.noImage.slice(0, 30).forEach(n => console.log("  - " + n));
    if (results.noImage.length > 30) {
      console.log("  ... and " + (results.noImage.length - 30) + " more");
    }
  }
  console.log("=".repeat(60) + "\n");
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
