/**
 * assign-images-new-shop.mjs
 * Fast image assignment for New Shop using DDG + OFF + CSE.
 * Run: node scripts/assign-images-new-shop.mjs
 */
import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

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

const app = getApps().length === 0 ? initializeApp({
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
  storageBucket: "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId: "1:339712048398:web:578ac498b0c942db7aab5f",
}) : getApps()[0];
const db = getFirestore(app);

const DELAY_MS = 500;
const CSE_KEY = process.env.GOOGLE_CSE_API_KEY;
const CSE_CX  = process.env.GOOGLE_CSE_CX;
const sleep   = ms => new Promise(r => setTimeout(r, ms));

async function fetchSafe(url, opts = {}, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0", "Accept": "text/html,application/json,*/*", ...opts.headers },
      ...opts,
    });
    clearTimeout(t); return r;
  } catch { clearTimeout(t); return null; }
}

function stripSize(name) {
  return name.replace(/\s*\d+\s*(g|ml|kg|l|ltr|pcs?|pc|jerry can|tin|carton|box)\b.*/i, "").trim();
}

async function searchOFF(name) {
  const clean = stripSize(name);
  for (const base of ["https://world.openfoodfacts.org","https://in.openfoodfacts.org"]) {
    const res = await fetchSafe(`${base}/cgi/search.pl?search_terms=${encodeURIComponent(clean)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,image_front_url`);
    if (!res?.ok) continue;
    try {
      const data = await res.json();
      const kw = clean.split(" ")[0].toLowerCase();
      const hit = (data.products||[]).find(p=>p.image_front_url&&(p.product_name||"").toLowerCase().includes(kw))
               || (data.products||[]).find(p=>p.image_front_url);
      if (hit?.image_front_url) return hit.image_front_url;
    } catch { continue; }
  }
  return null;
}

const vqdCache = new Map();
async function searchDDG(q) {
  try {
    let vqd = vqdCache.get(q);
    if (!vqd) {
      const page = await fetchSafe(`https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`);
      if (!page?.ok) return null;
      vqd = (await page.text()).match(/vqd=([\d-]+)/)?.[1];
      if (!vqd) return null;
      vqdCache.set(q, vqd);
    }
    const res = await fetchSafe(`https://duckduckgo.com/i.js?q=${encodeURIComponent(q)}&vqd=${vqd}&f=,,,,,&p=1`, { headers:{"Referer":"https://duckduckgo.com/"} });
    if (!res?.ok) return null;
    const data = await res.json();
    for (const r of (data.results||[]).slice(0,10)) {
      const url = r.image||"";
      if (url.match(/\.(jpg|jpeg|png)$/i) && !url.includes("logo") && !url.includes("icon") && !url.includes("banner")) return url;
    }
    return (data.results||[])[0]?.image||null;
  } catch { return null; }
}

async function searchCSE(q) {
  if (!CSE_KEY||!CSE_CX) return null;
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key",CSE_KEY); url.searchParams.set("cx",CSE_CX);
  url.searchParams.set("q",q+" product India"); url.searchParams.set("searchType","image");
  url.searchParams.set("num","5"); url.searchParams.set("imgType","photo");
  const res = await fetchSafe(url.toString());
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    return (data.items||[]).filter(i=>!i.link.endsWith(".svg")&&!i.link.endsWith(".gif"))[0]?.link||null;
  } catch { return null; }
}

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  New Shop — Fast Image Assignment (DDG + OFF + CSE)");
  console.log("=".repeat(60) + "\n");

  const shopsSnap = await getDocs(collection(db, "shops"));
  let shopId = null, shopName = "";
  for (const d of shopsSnap.docs) {
    if ((d.data().name||"").toLowerCase() === "new shop") { shopId=d.id; shopName=d.data().name; break; }
  }
  if (!shopId) { console.error("New Shop not found. Run seed script first."); process.exit(1); }
  console.log("Shop: " + shopName + " (" + shopId + ")\n");

  const snap = await getDocs(query(collection(db,"products"), where("shopId","==",shopId)));
  const products = snap.docs.map(d=>({id:d.id,...d.data()}))
    .filter(p=>!p.imageUrl||!p.imageUrl.startsWith("http"));
  console.log("Products needing images: " + products.length + "\n");
  if (!products.length) { console.log("All done."); process.exit(0); }

  let updated=0, failed=0, noImg=[];
  for (let i=0; i<products.length; i++) {
    const {id, name, localName} = products[i];
    const clean = stripSize(name);
    const hindi = localName ? localName.split(" ")[0] : "";
    const q = (clean + (hindi?" "+hindi:"") + " India").trim();
    console.log("[" + (i+1) + "/" + products.length + "] " + name);

    let imgUrl=null, source="";
    imgUrl = await searchOFF(name);       if (imgUrl) source="OFF";
    if (!imgUrl) { imgUrl = await searchDDG(q);  if (imgUrl) source="DDG"; }
    if (!imgUrl) { imgUrl = await searchCSE(clean); if (imgUrl) source="CSE"; }

    if (!imgUrl) { console.log("   NO IMAGE"); noImg.push(name); failed++; await sleep(DELAY_MS); continue; }
    await updateDoc(doc(db,"products",id), { imageUrl: imgUrl });
    console.log("   [" + source + "] " + imgUrl.slice(0,75) + "...");
    updated++;
    await sleep(DELAY_MS);
  }

  console.log("\n" + "=".repeat(60));
  console.log("Updated: " + updated + "  |  Failed: " + failed);
  if (noImg.length) { console.log("No image:"); noImg.forEach(n=>console.log("  - "+n)); }
  console.log("=".repeat(60) + "\n");
  process.exit(0);
}
main().catch(e => { console.error("Fatal:", e); process.exit(1); });
