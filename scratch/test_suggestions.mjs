import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
  storageBucket: "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId: "1:339712048398:web:578ac498b0c942db7aab5f",
  measurementId: "G-J2Y7R4XMMN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const shopId = "Yvgf5Us3pdNGHa0ljBGr";

const cleanProductName = (name) => {
  return name
    .toLowerCase()
    // remove quantities/units
    .replace(/\b\d+(?:\s*(?:g|kg|ml|l|ltr|pkt|pc|pcs|tin|sachet|g\b|kg\b|ml\b|l\b|ltr\b|pkt\b|pc\b|pcs\b|tin\b|sachet\b))\b/gi, '')
    // remove lone numbers
    .replace(/\b\d+\b/g, '')
    // remove common suffix/prefix words
    .replace(/\b(khula|khule|packet|pkt|tin|bulk|sachet|pcs|pc|pack|bottle|jar)\b/gi, '')
    // clean whitespace
    .replace(/\s+/g, ' ')
    .trim();
};

const unitKeywords = new Set([
  'kg', 'g', 'gram', 'grams', 'kilo', 'kilos', 'ml', 'l', 'ltr', 'liter', 'liters',
  'pkt', 'packet', 'packets', 'pc', 'pcs', 'piece', 'pieces', 'box', 'sachet', 'sachets',
  'half', 'आधा', 'किलो', 'ग्राम', 'लीटर', 'पैकेट', 'पीस', 'बोतल', 'डिब्बा', 'खुला', 'khula', 'khule'
]);

async function test() {
  const querySnapshot = await getDocs(collection(db, "products"));
  const catalog = [];
  querySnapshot.forEach(d => {
    if (d.data().shopId === shopId) {
      catalog.push({ id: d.id, ...d.data() });
    }
  });
  
  const item = {
    productId: catalog.find(p => p.name.includes("Poha 500g"))?.id,
    name: "Poha 500g",
    localName: "पोहा",
    spokenWord: "पोहा आधा किलो",
    category: "Grains & Cereals"
  };
  
  if (!item.productId) {
    console.log("Could not find Poha 500g in catalog");
    process.exit(1);
  }
  
  console.log("Test item:", item);
  
  const itemNameLower = (item.name || '').toLowerCase();
  const itemLocal = (item.localName || '').toLowerCase();
  const itemBrand = itemNameLower.split(' ')[0];
  const itemCategory = item.category;

  const spokenWord = (item.spokenWord || item.name || '').toLowerCase().trim();
  const spokenWords = spokenWord.split(/\s+/)
    .map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ""))
    .filter((w) => {
      if (w.length <= 1) return false;
      if (/^\d+[a-zA-Z]*$/.test(w)) return false;
      if (unitKeywords.has(w)) return false;
      return true;
    });
  
  console.log("spokenWords after filtering:", spokenWords);

  const brandRelated = catalog.filter(p => {
    if (p.id === item.productId) return false;
    if (itemCategory && p.category !== itemCategory) return false;
    const pn = (p.name || '').toLowerCase();
    return pn.startsWith(itemBrand + ' ') || pn === itemBrand;
  });
  
  console.log(`brandRelated count: ${brandRelated.length}`);

  const spokenRelated = spokenWords.length > 0 ? catalog.filter(p => {
    if (p.id === item.productId) return false;
    if (itemCategory && p.category !== itemCategory) return false;
    const pn = (p.name || '').toLowerCase();
    const pl = (p.localName || '').toLowerCase();
    return spokenWords.some((w) => pn.includes(w) || pl.includes(w));
  }) : [];
  
  console.log(`spokenRelated count: ${spokenRelated.length}`);
  console.log("spokenRelated matches:", spokenRelated.map(p => p.name));

  const related = [];
  const seenIds = new Set();
  for (const p of [...brandRelated, ...spokenRelated]) {
    if (!seenIds.has(p.id)) { seenIds.add(p.id); related.push(p); }
  }

  if (itemLocal) {
    for (const p of catalog) {
      if (p.id === item.productId || seenIds.has(p.id)) continue;
      if (itemCategory && p.category !== itemCategory) continue;
      if ((p.localName || '').toLowerCase() === itemLocal) {
        seenIds.add(p.id); related.push(p);
      }
    }
  }
  
  const baseClean = cleanProductName(item.name || '');
  const isSizeVariant = (p) => {
    if (p.id === item.productId) return false;
    const candidateClean = cleanProductName(p.name || '');
    return (
      baseClean.length >= 3 &&
      (candidateClean.startsWith(baseClean) || baseClean.startsWith(candidateClean) || candidateClean === baseClean)
    );
  };

  const sizeVariants = related
    .filter(isSizeVariant)
    .sort((a, b) => (a.price || 0) - (b.price || 0))
    .slice(0, 8);

  const sizeVariantIds = new Set(sizeVariants.map((p) => p.id));
  
  console.log("sizeVariants count:", sizeVariants.length);
  console.log("sizeVariants names:", sizeVariants.map(p => p.name));

  const brandMap = new Map();
  for (const p of related) {
    if (sizeVariantIds.has(p.id)) continue;
    const pBrand = (p.name || '').toLowerCase().split(' ')[0];
    if (pBrand === itemBrand) continue;
    const existing = brandMap.get(pBrand);
    if (!existing || (p.price > 0 && (existing.price === 0 || p.price < existing.price))) {
      brandMap.set(pBrand, p);
    }
  }

  const brandVariants = Array.from(brandMap.values()).slice(0, 12);
  console.log("brandVariants count:", brandVariants.length);
  console.log("brandVariants names:", brandVariants.map(p => p.name));

  process.exit(0);
}

test().catch(console.error);
