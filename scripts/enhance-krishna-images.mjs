/**
 * enhance-krishna-images.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches products for Shri Krishna Kirana shop and finds better images
 * using DuckDuckGo search, prioritizing Indian grocery platforms.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, query, where, doc, updateDoc, setDoc
} from "firebase/firestore";
import https from "https";

const firebaseConfig = {
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
  storageBucket: "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId: "1:339712048398:web:578ac498b0c942db7aab5f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const SHOP_ID = "Yvgf5Us3pdNGHa0ljBGr";

// ── Search Helpers ───────────────────────────────────────────────────────────

async function getVqd(query) {
  return new Promise((resolve, reject) => {
    https.get(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const match = data.match(/vqd=([\d-]+)/);
        if (match) resolve(match[1]);
        else resolve(null);
      });
    }).on('error', reject);
  });
}

async function searchImages(query, vqd) {
  return new Promise((resolve, reject) => {
    https.get(`https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Referer': 'https://duckduckgo.com/'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.results || []);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', reject);
  });
}

function isBulk(name, variant) {
  const n = (name || "").toLowerCase();
  const v = (variant || "").toLowerCase();
  return n.includes("bulk") || n.includes("pack of") || n.includes("carton") || n.includes("bundle") ||
         v.includes("bulk") || v.includes("pack of") || v.includes("carton") || v.includes("bundle") ||
         v.includes("4 pack") || v.includes("strip") || v.includes("family pack");
}

function getSearchQuery(name, variant) {
  let q = name.replace(/\(₹\d+\)/g, "").trim(); // Remove price tags like (₹10)
  if (variant && !q.includes(variant)) {
    q += ` ${variant}`;
  }
  
  if (isBulk(name, variant)) {
    q += " bulk bundle pack box";
  }
  
  return q;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🔍 Fetching products for Shri Krishna Kirana...\n");

  const q = query(collection(db, "products"), where("shopId", "==", SHOP_ID));
  const snap = await getDocs(q);
  const allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const GENERIC_PATTERNS = [
    '890/139/638/9712', '890/139/302/6672', '890/139/924/6012',
    '890/103/086/5169', '890/154/200/1246', '890/120/703/1717',
  ];

  const productsToUpdate = allProducts.filter(p => {
    if (!p.imageUrl) return true;
    if (GENERIC_PATTERNS.some(pat => p.imageUrl.includes(pat))) return true;
    
    // Specifically target bulk/bundle items to ensure they get a "bundle" image
    if (isBulk(p.name, p.variant) && p.imageSource !== "bing_thumbnail") return true;
    
    return false;
  });

  console.log(`📦 Found ${productsToUpdate.length} products to enhance.\n`);

  for (let i = 0; i < productsToUpdate.length; i++) {
    const product = productsToUpdate[i];
    const { id, name, variant } = product;

    console.log(`[${i + 1}/${productsToUpdate.length}] Processing: ${name} (${variant || "N/A"})`);

    const baseQuery = getSearchQuery(name, variant);
    // Use Bing thumbnail API for direct image access
    // Adding site:bigbasket.com or site:blinkit.com helps get high quality product photos
    const searchQuery = `${baseQuery} site:bigbasket.com OR site:blinkit.com OR site:amazon.in`;
    const encodedQuery = encodeURIComponent(searchQuery);
    const imageUrl = `https://tse1.mm.bing.net/th?q=${encodedQuery}`;

    console.log(`   ✅ Generated URL: ${imageUrl}`);
    
    try {
      // Update product
      await updateDoc(doc(db, "products", id), {
        imageUrl: imageUrl,
        imageSource: "bing_thumbnail",
        lastImageUpdate: new Date().toISOString()
      });

      // Update globalCatalog
      const nameKey = name.toLowerCase().trim();
      const gcId = `gc_${nameKey.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 60)}`;
      await setDoc(doc(db, "globalCatalog", gcId), {
        imageUrl: imageUrl,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log("   💾 Updated Firestore.");
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
    }

    // Small delay to avoid hammering Firestore
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log("\n✨ Image enhancement complete!");
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
