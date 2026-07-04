import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import Fuse from 'fuse.js';

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

const getLevenshteinDistance = (a, b) => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const countSyllables = (text) => {
  const clean = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
  if (!clean) return 0;
  if (/[\u0900-\u097F]/.test(clean)) {
    const devanagariSyllables = clean.match(/[\u0905-\u0914]|[\u0915-\u0939\u0958-\u095f](?!\u094d)/g);
    return devanagariSyllables ? devanagariSyllables.length : clean.length;
  } else {
    return clean.replace(/\s+/g, '').length;
  }
};

const getClosestWordSyllableCount = (query, cand) => {
  const isQueryHindi = /[\u0900-\u097F]/.test(query);
  const compareQuery = query;
  const options = [];
  if (cand.localName) options.push(cand.localName);
  if (cand.name) options.push(cand.name);
  if (Array.isArray(cand.localAliases)) {
    cand.localAliases.forEach(alias => {
      if (typeof alias === 'string') options.push(alias);
    });
  }

  let bestSyllables = 0;
  let minDistance = Infinity;
  const queryWords = compareQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);

  for (const option of options) {
    const candWords = option.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 0);
    const windowSize = queryWords.length;
    for (let start = 0; start <= candWords.length - windowSize; start++) {
      const subSeq = candWords.slice(start, start + windowSize).join(" ");
      const dist = getLevenshteinDistance(compareQuery.toLowerCase(), subSeq);
      if (dist < minDistance) {
        minDistance = dist;
        bestSyllables = countSyllables(subSeq);
      }
    }
  }
  return bestSyllables;
};

const transliterateHinglishToHindi = (text) => {
  const map = {
    'chawal': 'चावल', 'rice': 'चावल', 'poha': 'पोहा'
  };
  const words = text.toLowerCase().split(/\s+/);
  const mapped = words.map(w => map[w] || w);
  return mapped.join(" ");
};

async function run() {
  const shopId = "PyecarRrYeP4Nx2VqZLd";
  const snap = await getDocs(query(collection(db, "products"), where("shopId", "==", shopId)));
  const catalog = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const fuse = new Fuse(catalog, {
    keys: ['name', 'localName', 'localAliases'],
    threshold: 0.6,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2
  });

  const testInputs = [
    { text: "पोहा 1 किलो", name: "पोहा", quantity: 1, unit: "kg", isPacket: false, isKhula: false },
    { text: "चावल 2 किलो", name: "चावल", quantity: 2, unit: "kg", isPacket: false, isKhula: false }
  ];

  testInputs.forEach(item => {
    console.log(`\n================================================================`);
    console.log(`DEBUG MATCHING FOR INPUT: "${item.text}"`);
    console.log(`================================================================`);
    
    const searchName = item.name;
    const rawTextLower = item.text.toLowerCase();
    
    const isPacketRequested = /(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(packet|pack|pkt|packt|पैकेट|पीस|pc|pcs|piece|pieces|box|bottles?|can)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/i.test(rawTextLower);
    const isKhulaRequested = /(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(khula|loose|khulla|खुला)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/i.test(rawTextLower);
    
    let requestedWeightGrams = null;
    if (item.unit === 'kg' || item.unit === 'l') {
      requestedWeightGrams = item.quantity * 1000;
    } else if (item.unit === 'g' || item.unit === 'ml') {
      requestedWeightGrams = item.quantity;
    }

    console.log(`Parsed: searchName="${searchName}", requestedWeightGrams=${requestedWeightGrams}, isPacketRequested=${isPacketRequested}, isKhulaRequested=${isKhulaRequested}`);

    const origRes = fuse.search(searchName);
    const transliterated = transliterateHinglishToHindi(searchName);
    let combined = [...origRes];
    
    if (transliterated !== searchName.toLowerCase()) {
      const transRes = fuse.search(transliterated);
      const seen = new Map(origRes.map(r => [r.item.id || r.item.name, r]));
      for (const r of transRes) {
        const key = r.item.id || r.item.name;
        const existing = seen.get(key);
        if (!existing) {
          combined.push(r);
          seen.set(key, r);
        } else {
          if ((r.score ?? 1) < (existing.score ?? 1)) {
            existing.score = r.score;
          }
        }
      }
    }

    console.log(`Found ${combined.length} combined Fuse search results.`);

    let scoredResults = combined.map(r => {
      let score = r.score ?? 1;
      const cand = r.item;
      const isQueryHindi = /[\u0900-\u097F]/.test(searchName);
      const querySyllables = countSyllables(isQueryHindi ? searchName : transliterated);
      const matchSyllables = getClosestWordSyllableCount(searchName, cand);
      
      let syllablePenalty = 0;
      if (querySyllables > 0 && matchSyllables > 0) {
        syllablePenalty = Math.abs(querySyllables - matchSyllables) / Math.max(querySyllables, matchSyllables);
        score += syllablePenalty * 0.8;
      }
      
      const nameLower = (cand.name || '').toLowerCase();
      const localLower = (cand.localName || '').toLowerCase();
      const isCandLoose = (
        nameLower.includes('khula') || nameLower.includes('loose') || nameLower.includes('खुला') || nameLower.includes('खुली') ||
        localLower.includes('khula') || localLower.includes('loose') || localLower.includes('खुला') || localLower.includes('खुली') ||
        ['kg', 'g', 'l', 'ml'].includes(cand.baseUnit)
      );

      let adjustment = 0;
      if (isPacketRequested) {
        if (isCandLoose) {
          adjustment = 2.0;
          score += 2.0;
        } else if (requestedWeightGrams !== null) {
          const candWeight = cand.packetWeight || cand.baseQuantity || 0;
          if (candWeight === requestedWeightGrams) {
            adjustment = -0.05;
            score -= 0.05;
          }
        }
      } else if (isKhulaRequested) {
        if (!isCandLoose) {
          adjustment = 2.0;
          score += 2.0;
        }
      } else {
        if (requestedWeightGrams !== null) {
          if (!isCandLoose) {
            const candWeight = cand.packetWeight || cand.baseQuantity || 0;
            if (candWeight === requestedWeightGrams) {
              adjustment = -0.05;
              score -= 0.05;
            } else {
              adjustment = 0.25;
              score += 0.25;
            }
          }
        }
      }

      return {
        item: cand,
        fuseScore: r.score ?? 1,
        syllablePenalty,
        isCandLoose,
        adjustment,
        finalScore: score
      };
    });

    scoredResults.sort((a, b) => a.finalScore - b.finalScore);

    console.log("Top 15 sorted candidates:");
    scoredResults.slice(0, 15).forEach((r, idx) => {
      console.log(`  ${idx + 1}. [ID: ${r.item.id}] ${r.item.name} | Local: ${r.item.localName}`);
      console.log(`     FuseScore: ${r.fuseScore.toFixed(4)} | SyllablePenalty: ${(r.syllablePenalty * 0.8).toFixed(4)} | Loose: ${r.isCandLoose} | Adjust: ${r.adjustment} | FinalScore: ${r.finalScore.toFixed(4)}`);
    });
  });

  process.exit(0);
}
run();
