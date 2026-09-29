/**
 * Investigation script: simulates the exact scoring pipeline
 * from billing/page.tsx for Parle-G failure cases.
 * Run: node scratch/investigate_parleg.mjs
 */

// ── countSyllables (exact copy from billing/page.tsx) ─────────────────────────
function countSyllables(text) {
  const clean = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
  if (!clean) return 0;
  if (/[\u0900-\u097F]/.test(clean)) {
    try {
      const segmenter = new Intl.Segmenter('hi', { granularity: 'grapheme' });
      const segments = [...segmenter.segment(clean)];
      return segments.filter(s => s.segment.trim().length > 0).length;
    } catch(e) {
      const devanagariSyllables = clean.match(/[\u0905-\u0914]|[\u0915-\u0939\u0958-\u095f](?!\u094d)/g);
      return devanagariSyllables ? devanagariSyllables.length : clean.length;
    }
  } else {
    return clean.replace(/\s+/g, '').length;
  }
}

// ── getLevenshteinDistance (exact copy from billing/page.tsx) ─────────────────
function getLevenshteinDistance(a, b) {
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
}

// ── HINDI_TO_HINGLISH_MAP (from transliterate.ts — only relevant entries) ─────
const HINDI_TO_HINGLISH_MAP = {
  'बिस्कुट': 'biscuit',
  'बिस्किट': 'biscuit',
  'पैकेट': 'packet',
  'पीस': 'piece',
  'खुला': 'khula',
};

function transliterateHindiToHinglish(text) {
  const trimmed = text.toLowerCase().trim();
  if (HINDI_TO_HINGLISH_MAP[trimmed]) return HINDI_TO_HINGLISH_MAP[trimmed];
  const words = trimmed.split(/\s+/);
  const mapped = words.map(w => HINDI_TO_HINGLISH_MAP[w] || w);
  return mapped.join(" ");
}

function transliterateHinglishToHindi(text) {
  // bare-minimum — not used in this analysis path
  return text;
}

// ── getClosestWordSyllableCount (exact copy from billing/page.tsx) ─────────────
function getClosestWordSyllableCount(query, cand, isHindi) {
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
    cand.localAliases.forEach(alias => {
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
  let bestOption = '';
  let bestSubseq = '';

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
        bestSubseq = subSeq;
      }
    }
  }

  return { bestSyllables, minDistance, bestOption, bestSubseq };
}

// ── Candidates from actual catalog ─────────────────────────────────────────────
const candidates = [
  { id: 'QTlm4uu4de2ZsmrOBybn', name: 'Parle-G Biscuit',    localName: 'पारले-जी बिस्किट',   localAliases: [] },
  { id: '0RFz2F9mJSR9jTQ50yDb', name: 'KrackJack Biscuit',  localName: 'क्रैकजैक बिस्किट',   localAliases: [] },
  // Add a few more Parle products that appear in biscuits
  { id: 'K6mUrqu3GbnFJNRFWgo0', name: 'Parle-G Gluco Biscuit', localName: 'पारले-जी ग्लूको बिस्किट', localAliases: [] },
  { id: 'PE1UCa2ZmhvL4w1fVim4', name: 'Parle-G Gold Biscuit',  localName: 'पारले-जी गोल्ड बिस्किट',   localAliases: [] },
  { id: 'pyXU87Gs9imzj8FEuwzp', name: 'Parle Bourbon Biscuit', localName: 'पारले बॉर्बन बिस्किट',     localAliases: [] },
];

// ── SCENARIO A: query = "पारले-जी बिस्कुट" (Trace 2) ─────────────────────────
console.log("\n════════════════════════════════════════════════════════");
console.log("SCENARIO A: query = 'पारले-जी बिस्कुट' (Trace 2 — exact brand query)");
console.log("════════════════════════════════════════════════════════\n");

const queryA = "पारले-जी बिस्कुट";
// Billing page does: searchName = item.name.replace(/\d+/g,'').replace(/\b(...)\b/gi,'').trim()
// item.name after parseVoiceItems for "पारले-जी बिस्कुट" would be "पारले-जी बिस्कुट" (no numbers/units)
const searchNameA = queryA; // no stripping needed

console.log("searchName:", searchNameA);
const isQueryHindiA = /[\u0900-\u097F]/.test(searchNameA);
console.log("isQueryHindi:", isQueryHindiA);
const querySylA = countSyllables(isQueryHindiA ? searchNameA : transliterateHindiToHinglish(searchNameA));
console.log("querySyllables (from countSyllables):", querySylA);

// Show grapheme breakdown
try {
  const segmenter = new Intl.Segmenter('hi', { granularity: 'grapheme' });
  const segments = [...segmenter.segment(searchNameA)].filter(s => s.segment.trim().length > 0);
  console.log("Graphemes in query:", segments.map(s => s.segment));
} catch(e) {}

console.log("\n--- Scoring each candidate ---\n");

for (const cand of candidates) {
  const result = getClosestWordSyllableCount(searchNameA, cand, isQueryHindiA);
  const matchSyl = result.bestSyllables;
  const syllablePenaltyRaw = (querySylA > 0 && matchSyl > 0)
    ? Math.abs(querySylA - matchSyl) / Math.max(querySylA, matchSyl)
    : 0;
  const syllablePenaltyAdded = syllablePenaltyRaw * 0.8;

  console.log(`Product: "${cand.name}" (${cand.localName})`);
  console.log(`  Best window: "${result.bestSubseq}" from option "${result.bestOption}"`);
  console.log(`  Levenshtein distance to query: ${result.minDistance}`);

  // Show graphemes in best window
  if (/[\u0900-\u097F]/.test(result.bestSubseq)) {
    try {
      const seg = new Intl.Segmenter('hi', { granularity: 'grapheme' });
      const segs = [...seg.segment(result.bestSubseq)].filter(s => s.segment.trim().length > 0);
      console.log(`  Graphemes in window: [${segs.map(s => s.segment).join(', ')}]`);
    } catch(e) {}
  }

  console.log(`  matchSyllables: ${matchSyl}`);
  console.log(`  querySyllables: ${querySylA}`);
  console.log(`  syllablePenaltyRaw: ${syllablePenaltyRaw.toFixed(4)}`);
  console.log(`  syllablePenaltyAdded (×0.8): ${syllablePenaltyAdded.toFixed(4)}`);
  console.log(`  *** If raw Fuse score = X, finalScore = X + ${syllablePenaltyAdded.toFixed(4)} ***`);
  console.log();
}

// ── SCENARIO B: query = "परले-ग बिस्किट दो पैकेट" (Trace 1) ──────────────────
console.log("\n════════════════════════════════════════════════════════");
console.log("SCENARIO B: query = 'परले-ग बिस्किट दो पैकेट' (Trace 1 — ASR + quantity)");
console.log("════════════════════════════════════════════════════════\n");

// parseVoiceItems normalization:
// "दो" gets replaced to " 2 " by the numMap regex in billing page
// So after normalization: "परले-ग बिस्किट 2 पैकेट"
// parseVoiceItems would produce: name="परले-ग बिस्किट", quantity=2, unit="pc"
// Then searchName = "परले-ग बिस्किट" (no stripping needed - no digits/units in name)

const queryB = "परले-ग बिस्किट"; // after parseVoiceItems extraction
const searchNameB = queryB;

console.log("After parseVoiceItems extraction:");
console.log("  productName:", queryB);
console.log("  quantity: 2, unit: pc");
console.log("\nsearchName:", searchNameB);

const isQueryHindiB = /[\u0900-\u097F]/.test(searchNameB);
const querySylB = countSyllables(isQueryHindiB ? searchNameB : transliterateHindiToHinglish(searchNameB));
console.log("querySyllables:", querySylB);

try {
  const segmenter = new Intl.Segmenter('hi', { granularity: 'grapheme' });
  const segments = [...segmenter.segment(searchNameB)].filter(s => s.segment.trim().length > 0);
  console.log("Graphemes in query:", segments.map(s => s.segment));
} catch(e) {}

console.log("\n--- Scoring each candidate ---\n");

for (const cand of candidates) {
  const result = getClosestWordSyllableCount(searchNameB, cand, isQueryHindiB);
  const matchSyl = result.bestSyllables;
  const syllablePenaltyRaw = (querySylB > 0 && matchSyl > 0)
    ? Math.abs(querySylB - matchSyl) / Math.max(querySylB, matchSyl)
    : 0;
  const syllablePenaltyAdded = syllablePenaltyRaw * 0.8;

  console.log(`Product: "${cand.name}" (${cand.localName})`);
  console.log(`  Best window: "${result.bestSubseq}" from option "${result.bestOption}"`);
  console.log(`  Levenshtein distance to query: ${result.minDistance}`);
  console.log(`  matchSyllables: ${matchSyl}`);
  console.log(`  querySyllables: ${querySylB}`);
  console.log(`  syllablePenaltyRaw: ${syllablePenaltyRaw.toFixed(4)}`);
  console.log(`  syllablePenaltyAdded (×0.8): ${syllablePenaltyAdded.toFixed(4)}`);
  console.log(`  *** If raw Fuse score = X, finalScore = X + ${syllablePenaltyAdded.toFixed(4)} ***`);
  console.log();
}

// ── SCENARIO C: parseVoiceItems on "परले-ग बिस्किट दो पैकेट" ─────────────────
console.log("\n════════════════════════════════════════════════════════");
console.log("SCENARIO C: What does parseVoiceItems actually do with 'परले-ग बिस्किट दो पैकेट'?");
console.log("════════════════════════════════════════════════════════\n");

// Key question: does "दो" get extracted as quantity=2, or does it stay in the name?
// From billing/page.tsx parseVoiceItems PRE-PROCESSING:
// .replace(/(to|too|tu|two|तो|टो|do|दो)/gi, ' 2 ')
// This is applied GLOBALLY — "दो" anywhere in the string becomes " 2 "
// So "परले-ग बिस्किट दो पैकेट" → "परले-ग बिस्किट 2 पैकेट"
// After tokenization: ["परले-ग", "बिस्किट", "2", "पैकेट"]
// "पैकेट" is in unitMap → unit="pc"
// "2" is a number → qty=2
// But HOW is the name built? 
// The words "परले-ग" and "बिस्किट" are not numbers/units, so they go into pendingName
// Then "2" triggers commitItem(2, "pc")
// So: name="परले-ग बिस्किट", quantity=2, unit="pc"
// searchName = "परले-ग बिस्किट" (no digit/unit stripping needed)

console.log("Text after PRE-PROCESSING:");
let testText = "परले-ग बिस्किट दो पैकेट";
testText = testText.replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(do|दो)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/gi, ' 2 ');
console.log("  After दो→2:", testText);
console.log("  After पैकेट is in unitMap: unit='pc'");
console.log("  parseVoiceItems result: name='परले-ग बिस्किट', qty=2, unit='pc'");
console.log("  searchName (after digit/unit strip): 'परले-ग बिस्किट'");
console.log("\n→ The quantity IS separated correctly from the product name.");
console.log("→ The product search query is 'परले-ग बिस्किट' — the quantity does NOT pollute the search.");

// BUT: what if the regex for 'दो' doesn't fire due to word-boundary issues?
// Let's check the raw text handling in billing page:
// text.toLowerCase() → "परले-ग बिस्किट दो पैकेट"
// In billing page's parseVoiceItems, the replacement uses lookbehind:
// .replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(to|...|दो)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/gi, ' 2 ')
// "दो" is preceded by " " (matches lookbehind) and followed by " " (matches lookahead)
// So "दो" SHOULD be replaced by " 2 "

// ── SCENARIO D: Grapheme analysis of key words ────────────────────────────────
console.log("\n════════════════════════════════════════════════════════");
console.log("SCENARIO D: Grapheme analysis of key Devanagari words");
console.log("════════════════════════════════════════════════════════\n");

const words = [
  "पारले-जी बिस्कुट",    // Query in trace 2
  "पारले-जी बिस्किट",    // Parle-G Biscuit localName
  "परले-ग बिस्किट",      // Query in trace 1 (ASR variant)
  "क्रैकजैक बिस्किट",    // KrackJack localName
  "KrackJack Biscuit",   // KrackJack English name
  "Parle-G Biscuit",     // Parle-G English name
  "पारले-जी",            // Brand alone
  "परले-ग",              // ASR variant of brand
];

const seg = new Intl.Segmenter('hi', { granularity: 'grapheme' });
for (const w of words) {
  const graphemes = [...seg.segment(w)].filter(s => s.segment.trim().length > 0);
  console.log(`"${w}"`);
  console.log(`  Graphemes (${graphemes.length}): [${graphemes.map(g => g.segment).join(' | ')}]`);
  console.log(`  countSyllables: ${countSyllables(w)}`);
  console.log();
}

// ── SCENARIO E: The window-matching problem ────────────────────────────────────
console.log("\n════════════════════════════════════════════════════════");
console.log("SCENARIO E: Window matching in getClosestWordSyllableCount");
console.log("═════════════════════════════════════════════════════════\n");
console.log("Query: 'पारले-जी बिस्कुट' → compareQuery (Hindi) = 'पारले-जी बिस्कुट'");
console.log("queryWords = ['पारले-जी', 'बिस्कुट'] (split on spaces after stripping hyphens)");
console.log("windowSize = 2");
console.log("\nFor 'Parle-G Biscuit' (localName 'पारले-जी बिस्किट'):");
const qWords = "पारले-जी बिस्कुट".toLowerCase().split(/\s+/).filter(w => w.length > 0);
const cLocalName = "पारले-जी बिस्किट";
const cLocalWords = cLocalName.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ").split(/\s+/).filter(w => w.length > 0);
console.log("  queryWords:", qWords);
console.log("  candWords (from localName):", cLocalWords);
for (let start = 0; start <= cLocalWords.length - qWords.length; start++) {
  const subSeq = cLocalWords.slice(start, start + qWords.length).join(" ");
  const dist = getLevenshteinDistance("पारले-जी बिस्कुट".toLowerCase(), subSeq);
  const syl = countSyllables(subSeq);
  console.log(`  window[${start}]: "${subSeq}" → dist=${dist}, syllables=${syl}`);
}
