import Fuse from 'fuse.js';

const catalog = [
  { id: '1', name: "Hajmola Candy", localName: "हाजमोला कैंडी" },
  { id: '2', name: "Saffola Gold Multi-Source Edible Oil 1L", localName: "सफोला गोल्ड मल्टी-सोर्स एडिबल ऑयल" },
  { id: '3', name: "Nilon's Classic Mixed Pickle 500g", localName: "निलॉन्स क्लासिक मिक्स्ड अचार" },
  { id: '4', name: "Everest Chhole Masala 100g", localName: "एवरेस्ट छोले मसाला" },
  { id: '5', name: "Catch Chhole Masala 100g", localName: "कैच छोले मसाला" }
];

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
  const options = [];
  if (isHindi) {
    if (cand.localName) options.push(cand.localName);
    if (Array.isArray(cand.localAliases)) {
      cand.localAliases.forEach(alias => {
        if (typeof alias === 'string' && /[\u0900-\u097F]/.test(alias)) {
          options.push(alias);
        }
      });
    }
  } else {
    if (cand.name) options.push(cand.name);
    if (Array.isArray(cand.localAliases)) {
      cand.localAliases.forEach(alias => {
        if (typeof alias === 'string' && !/[\u0900-\u097F]/.test(alias)) {
          options.push(alias);
        }
      });
    }
  }

  let bestSyllables = 0;
  let minDistance = Infinity;

  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);

  for (const option of options) {
    const candWords = option.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 0);
    
    const windowSize = queryWords.length;
    for (let start = 0; start <= candWords.length - windowSize; start++) {
      const subSeq = candWords.slice(start, start + windowSize).join(" ");
      const dist = getLevenshteinDistance(query.toLowerCase(), subSeq);
      if (dist < minDistance) {
        minDistance = dist;
        bestSyllables = countSyllables(subSeq);
      }
    }
  }

  return bestSyllables;
};

const matchProduct = (searchName, useLengthConstraint = false) => {
  // Match function using Fuse and the new length-matching system
  const fuse = new Fuse(catalog, {
    keys: ['name', 'localName', 'localAliases'],
    threshold: 0.6,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2
  });

  const result = fuse.search(searchName);
  let bestMatch = null;

  const isQueryHindi = /[\u0900-\u097F]/.test(searchName);
  const querySyllables = countSyllables(searchName);

  let scoredResults = result.map(r => {
    let score = r.score ?? 1;
    const cand = r.item;

    if (useLengthConstraint) {
      const matchSyllables = getClosestWordSyllableCount(searchName, cand, isQueryHindi);
      if (querySyllables > 0 && matchSyllables > 0) {
        const syllablePenalty = Math.abs(querySyllables - matchSyllables) / Math.max(querySyllables, matchSyllables);
        score += syllablePenalty * 0.8;
      }
    }

    return { item: cand, score };
  });

  scoredResults.sort((a, b) => a.score - b.score);

  if (scoredResults.length && scoredResults[0].score <= 0.6) {
    bestMatch = scoredResults[0].item;
  }

  // Enhanced multi-word fallback:
  if (!bestMatch) {
    const words = searchName.split(/\s+/).filter(w => w.length > 2);
    if (words.length > 0) {
      const productHits = new Map();
      for (const w of words) {
        const subResult = fuse.search(w);
        for (const r of subResult) {
          if ((r.score ?? 1) > 0.45) break;
          const id = r.item.id;
          const existing = productHits.get(id);
          if (!existing) {
            productHits.set(id, { item: r.item, hitCount: 1, bestScore: r.score ?? 1 });
          } else {
            existing.hitCount += 1;
            existing.bestScore = Math.min(existing.bestScore, r.score ?? 1);
          }
        }
      }
      if (productHits.size > 0) {
        const hitCandidates = Array.from(productHits.values()).map(h => {
          let score = h.bestScore;
          const cand = h.item;

          if (useLengthConstraint) {
            const matchSyllables = getClosestWordSyllableCount(searchName, cand, isQueryHindi);
            if (querySyllables > 0 && matchSyllables > 0) {
              const syllablePenalty = Math.abs(querySyllables - matchSyllables) / Math.max(querySyllables, matchSyllables);
              score += syllablePenalty * 0.8;
            }
          }

          return { item: cand, hitCount: h.hitCount, score };
        });

        hitCandidates.sort((a, b) =>
          b.hitCount !== a.hitCount ? b.hitCount - a.hitCount : a.score - b.score
        );

        if (hitCandidates.length && hitCandidates[0].score <= 0.6) {
          bestMatch = hitCandidates[0].item;
        }
      }
    }
  }

  return bestMatch;
};

// Run test cases
const testCases = [
  "चोला",
  "छोले",
  "लॉन्ग"
];

console.log("=== Testing BEFORE implementing constraints ===");
testCases.forEach(query => {
  const match = matchProduct(query, false);
  console.log(`Query: "${query}" -> Match:`, match ? `${match.name} (${match.localName})` : "No match");
});

console.log("\n=== Testing AFTER implementing constraints ===");
testCases.forEach(query => {
  const match = matchProduct(query, true);
  console.log(`Query: "${query}" -> Match:`, match ? `${match.name} (${match.localName})` : "No match");
});
