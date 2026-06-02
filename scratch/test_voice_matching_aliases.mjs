import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import Fuse from "fuse.js";

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

// Hinglish to Hindi transliteration mapping for common Kirana brands, products, and categories
const HINGLISH_TO_HINDI_MAP = {
  // Brands
  'lux': 'लक्स',
  'nirma': 'निरमा',
  'navratna': 'नवरत्न',
  'navratan': 'नवरत्न',
  'dettol': 'डिटॉल',
  'detol': 'डिटॉल',
  'everest': 'एवरेस्ट',
  'pushp': 'पुष्प',
  'catch': 'कैच',
  'suhana': 'सुहाना',
  'fortune': 'फॉर्च्यून',
  'dhara': 'धारा',
  'tata': 'टाटा',
  'amul': 'अमूल',
  'sanchi': 'सांची',
  'patanjali': 'पतंजलि',
  'colgate': 'कोलगेट',
  'pepsodent': 'पेप्सोडेंट',
  'surf': 'सर्फ',
  'rin': 'रिन',
  'tide': 'टाइड',
  'ghadi': 'घड़ी',
  'harpic': 'हार्पिक',
  'lizol': 'लाइज़ोल',
  'silver': 'सिल्वर',
  'coin': 'कॉइन',
  
  // Spices & Groceries
  'sabun': 'साबुन', 'saboon': 'साबुन', 'soap': 'साबुन', 'sop': 'साबुन',
  'tel': 'तेल', 'oil': 'तेल',
  'doodh': 'दूध', 'milk': 'दूध',
  'atta': 'आटा', 'aata': 'आटा',
  'chawal': 'चावल', 'rice': 'चावल',
  'dal': 'दाल', 'daal': 'दाल',
  'namak': 'नमक', 'salt': 'नमक',
  'chini': 'चीनी', 'shakkar': 'चीनी', 'sugar': 'चीनी',
  'chai': 'चाय', 'tea': 'चाय', 'patti': 'चाय',
  'masala': 'मसाला', 'masale': 'मसाला',
  'mirch': 'मिर्च', 'mirchi': 'मिर्च', 'chilli': 'मिर्च', 'chili': 'मिर्च',
  'haldi': 'हल्दी', 'turmeric': 'हल्दी',
  'dhaniya': 'धनिया', 'coriander': 'धनिया',
  'jeera': 'जीरा', 'cumin': 'जीरा',
  'dahi': 'दही', 'curd': 'दही',
  'paneer': 'पनीर',
  'biscuit': 'बिस्कुट', 'biscut': 'बिस्कुट', 'biscuits': 'बिस्कुट',
  'shampoo': 'शैम्पू', 'shampoe': 'शैम्पू',
  'powder': 'पाउडर', 'powdr': 'पाउडर',
  'bar': 'बार',
  'liquid': 'लिक्विड',
  'handwash': 'हैंडवॉश',
  'sanitizer': 'सैनिटाइज़र',
  'laundry': 'कपड़े',
  'cleaner': 'क्लीनर',
  'comb': 'कंघी',
  'paste': 'पेस्ट',
  'brush': 'ब्रश',
  'makhana': 'मखाना',
  'daliya': 'दलिया',
  'rava': 'रवा',
  'sooji': 'सूजी',
  'suji': 'सूजी',
  'poha': 'पोहा',
  'maida': 'मैदा',
  'besan': 'बेसन',
  'ghee': 'घी',
  'chana': 'चना',
  'chhana': 'चना',
  'chhola': 'छोला'
};

function transliterateHinglishToHindi(text) {
  const words = text.toLowerCase().split(/\s+/);
  const mapped = words.map(w => HINGLISH_TO_HINDI_MAP[w] || w);
  return mapped.join(" ");
}

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
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const countSyllables = (word) => {
  const clean = word.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
  if (clean.length === 0) return 0;
  if (/[\u0900-\u097F]/.test(clean)) {
    try {
      const segmenter = new Intl.Segmenter('hi', { granularity: 'grapheme' });
      const segments = [...segmenter.segment(clean)];
      return segments.filter(s => s.segment.trim().length > 0).length;
    } catch (e) {
      const devanagariSyllables = clean.match(/[\u0905-\u0914]|[\u0915-\u0939\u0958-\u095f](?!\u094d)/g);
      return devanagariSyllables ? devanagariSyllables.length : clean.length;
    }
  } else {
    return clean.replace(/\s+/g, '').length;
  }
};

const getClosestWordSyllableCount = (query, cand, isHindi) => {
  const isQueryHindi = /[\u0900-\u097F]/.test(query);
  const compareQuery = isQueryHindi ? query : transliterateHinglishToHindi(query);

  const options = [];
  
  if (cand.localName) options.push(cand.localName);
  if (cand.name) {
    options.push(cand.name);
    const transName = transliterateHinglishToHindi(cand.name);
    if (transName !== cand.name.toLowerCase()) options.push(transName);
  }
  
  if (Array.isArray(cand.localAliases)) {
    cand.localAliases.forEach((alias) => {
      if (typeof alias === 'string') {
        options.push(alias);
        if (!/[\u0900-\u097F]/.test(alias)) {
          const transAlias = transliterateHinglishToHindi(alias);
          if (transAlias !== alias.toLowerCase()) options.push(transAlias);
        }
      }
    });
  }

  let bestSyllables = 0;
  let minDistance = Infinity;
  let bestOption = "";

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
        bestOption = option;
      }
    }
  }

  return { syllables: bestSyllables, bestOption, minDistance };
};

async function test() {
  console.log("Fetching catalog...");
  const snap = await getDocs(query(collection(db, "products"), where("shopId", "==", SHOP_ID)));
  const catalog = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(`Fetched ${catalog.length} products.\n`);

  const fuse = new Fuse(catalog, {
    keys: ['name', 'localName', 'localAliases'],
    threshold: 0.6,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2
  });

  const queryText = "lux sabun";
  const searchName = queryText.replace(/\d+/g, '').replace(/\b(kg|g|ml|l|ltr|pcs?|pieces?|pkt|pack|packet|day|meter|m)\b/gi, '').trim();
  
  // Try original and transliterated
  const origRes = fuse.search(searchName);
  const transliterated = transliterateHinglishToHindi(searchName);
  const transRes = fuse.search(transliterated);

  console.log(`Original search ("${searchName}") matches: ${origRes.length}`);
  console.log(`Transliterated search ("${transliterated}") matches: ${transRes.length}`);

  console.log("\n--- Debugging Search Results ---");
  console.log("In origRes ('lux sabun'):");
  origRes.forEach(r => {
    if (r.item.name.toLowerCase().includes("lux") || r.item.name.includes("Dettol Soap Cool 75g")) {
      console.log(`- ID: ${r.item.id} | Name: "${r.item.name}" | Score: ${r.score}`);
    }
  });

  console.log("\nIn transRes ('लक्स साबुन'):");
  transRes.forEach(r => {
    if (r.item.name.toLowerCase().includes("lux") || r.item.name.includes("Dettol Soap Cool 75g")) {
      console.log(`- ID: ${r.item.id} | Name: "${r.item.name}" | Score: ${r.score}`);
    }
  });
  console.log("--------------------------------\n");

  const combined = [...origRes];
  const seen = new Map(origRes.map(r => [r.item.id, r]));
  for (const r of transRes) {
    const existing = seen.get(r.item.id);
    if (!existing) {
      combined.push(r);
      seen.set(r.item.id, r);
    } else {
      if ((r.score ?? 1) < (existing.score ?? 1)) {
        existing.score = r.score;
      }
    }
  }

  console.log(`Combined matches count: ${combined.length}`);

  const scoredResults = combined.map(r => {
    let score = r.score ?? 1;
    const cand = r.item;
    
    const isQueryHindi = /[\u0900-\u097F]/.test(searchName);
    const querySyllables = countSyllables(isQueryHindi ? searchName : transliterateHinglishToHindi(searchName));
    const syllableInfo = getClosestWordSyllableCount(searchName, cand, isQueryHindi);
    const matchSyllables = syllableInfo.syllables;
    
    if (querySyllables > 0 && matchSyllables > 0) {
      const syllablePenalty = Math.abs(querySyllables - matchSyllables) / Math.max(querySyllables, matchSyllables);
      score += syllablePenalty * 0.8;
    }
    
    return { 
      item: cand, 
      rawScore: r.score, 
      score, 
      querySyllables, 
      matchSyllables, 
      bestOption: syllableInfo.bestOption,
      minDistance: syllableInfo.minDistance
    };
  });

  scoredResults.sort((a, b) => a.score - b.score);

  console.log("\nTop 15 Matches for 'lux sabun':");
  scoredResults.slice(0, 15).forEach((r, idx) => {
    console.log(`${idx + 1}. "${r.item.name}" (localName: "${r.item.localName || ''}")`);
    console.log(`   Combined: ${r.score.toFixed(4)} | Fuse: ${r.rawScore?.toFixed(4)} | Dist: ${r.minDistance}`);
    console.log(`   Query Syllables: ${r.querySyllables} | Best Option (${r.bestOption}): ${r.matchSyllables}`);
    console.log(`   localAliases: ${JSON.stringify(r.item.localAliases || [])}`);
    console.log('---');
  });

  console.log("\nSpecific Lux Soap Products Scores:");
  const luxIds = ["8OpJGv6BT6RoF8TQ3zBT", "Mg4h5GnYJggAXO2NlkXe", "Ua2gOQvsBFvyLkSCtYGS", "bE2rMdwfZRY5PDDxkEwu", "cvvd4plKeKz5RWWnOG6c"];
  scoredResults.forEach((r) => {
    if (luxIds.includes(r.item.id)) {
      console.log(`- "${r.item.name}"`);
      console.log(`  Combined: ${r.score.toFixed(4)} | Fuse: ${r.rawScore?.toFixed(4)} | Dist: ${r.minDistance}`);
      console.log(`  Query Syllables: ${r.querySyllables} | Best Option (${r.bestOption}): ${r.matchSyllables}`);
      console.log(`  localAliases: ${JSON.stringify(r.item.localAliases || [])}`);
    }
  });

  process.exit(0);
}

test().catch(console.error);
