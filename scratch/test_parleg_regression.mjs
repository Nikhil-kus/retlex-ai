/**
 * Regression tests for the Parle-G syllable-penalty hyphen fix.
 *
 * Tests the full scoring pipeline (Fuse + syllable penalty) against the real
 * krishna-products-catalog.json, using both the BUGGY and FIXED versions of
 * getClosestWordSyllableCount, so we can show exact before/after rankings.
 *
 * Run:  node scratch/test_parleg_regression.mjs
 */

import Fuse from 'fuse.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '..', 'krishna-products-catalog.json');
const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));

// ── Shared helpers (identical to billing/page.tsx) ────────────────────────────

function countSyllables(text) {
  const clean = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').trim();
  if (!clean) return 0;
  if (/[\u0900-\u097F]/.test(clean)) {
    const segmenter = new Intl.Segmenter('hi', { granularity: 'grapheme' });
    const segments = [...segmenter.segment(clean)];
    return segments.filter(s => s.segment.trim().length > 0).length;
  }
  return clean.replace(/\s+/g, '').length;
}

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

// Minimal transliteration (same as transliterate.ts — only entries relevant here)
const HINDI_TO_HINGLISH = { 'बिस्कुट': 'biscuit', 'बिस्किट': 'biscuit', 'पैकेट': 'packet' };
function transliterateHindiToHinglish(t) {
  const words = t.toLowerCase().trim().split(/\s+/);
  return words.map(w => HINDI_TO_HINGLISH[w] || w).join(' ');
}
const HINGLISH_TO_HINDI = { biscuit: 'बिस्कुट', biscut: 'बिस्कुट', biscuits: 'बिस्कुट', parle: 'पारले' };
function transliterateHinglishToHindi(t) {
  const words = t.toLowerCase().split(/\s+/);
  return words.map(w => HINGLISH_TO_HINDI[w] || w).join(' ');
}

// ── BUGGY version (original — no hyphen strip on query side) ─────────────────
function getClosestWordSyllableCount_BUGGY(query, cand) {
  const isQueryHindi = /[\u0900-\u097F]/.test(query);
  const compareQuery = isQueryHindi ? query : transliterateHinglishToHindi(query);
  const options = [];
  if (cand.localName) options.push(cand.localName);
  if (cand.name) {
    options.push(cand.name);
    const t = transliterateHinglishToHindi(cand.name);
    if (t !== cand.name.toLowerCase()) options.push(t);
  }
  if (Array.isArray(cand.localAliases)) {
    cand.localAliases.forEach(a => {
      if (typeof a === 'string') {
        options.push(a);
        if (!/[\u0900-\u097F]/.test(a)) {
          const t = transliterateHinglishToHindi(a);
          if (t !== a.toLowerCase()) options.push(t);
        }
      }
    });
  }
  let bestSyllables = 0, minDistance = Infinity;
  // BUG: query NOT normalised — hyphens stay in tokens
  const queryWords = compareQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  for (const option of options) {
    const candWords = option.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
      .split(/\s+/).filter(w => w.length > 0);
    const windowSize = queryWords.length;
    for (let start = 0; start <= candWords.length - windowSize; start++) {
      const subSeq = candWords.slice(start, start + windowSize).join(' ');
      const dist = getLevenshteinDistance(compareQuery.toLowerCase(), subSeq);
      if (dist < minDistance) { minDistance = dist; bestSyllables = countSyllables(subSeq); }
    }
  }
  return bestSyllables;
}

// ── FIXED version (matches the patch applied to billing/page.tsx) ─────────────
function getClosestWordSyllableCount_FIXED(query, cand) {
  const isQueryHindi = /[\u0900-\u097F]/.test(query);
  const compareQuery = isQueryHindi ? query : transliterateHinglishToHindi(query);
  const options = [];
  if (cand.localName) options.push(cand.localName);
  if (cand.name) {
    options.push(cand.name);
    const t = transliterateHinglishToHindi(cand.name);
    if (t !== cand.name.toLowerCase()) options.push(t);
  }
  if (Array.isArray(cand.localAliases)) {
    cand.localAliases.forEach(a => {
      if (typeof a === 'string') {
        options.push(a);
        if (!/[\u0900-\u097F]/.test(a)) {
          const t = transliterateHinglishToHindi(a);
          if (t !== a.toLowerCase()) options.push(t);
        }
      }
    });
  }
  let bestSyllables = 0, minDistance = Infinity;
  // FIX: normalise hyphens on the query side too — symmetric with candWords
  const normalisedQuery = compareQuery.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
  const queryWords = normalisedQuery.split(/\s+/).filter(w => w.length > 0);
  for (const option of options) {
    const candWords = option.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
      .split(/\s+/).filter(w => w.length > 0);
    const windowSize = queryWords.length;
    for (let start = 0; start <= candWords.length - windowSize; start++) {
      const subSeq = candWords.slice(start, start + windowSize).join(' ');
      const dist = getLevenshteinDistance(normalisedQuery, subSeq);
      if (dist < minDistance) { minDistance = dist; bestSyllables = countSyllables(subSeq); }
    }
  }
  return bestSyllables;
}

// ── Full scoring pipeline (mirrors billing/page.tsx processVoiceTextToItems) ──

const fuse = new Fuse(catalog, {
  keys: ['name', 'localName', 'localAliases'],
  threshold: 0.6,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
});

const TOP_N = 15;

function scoreQuery(searchName, getSyllablesFn) {
  const origRes = fuse.search(searchName);
  const isQueryHindiScript = /[\u0900-\u097F]/.test(searchName);

  let combined = [...origRes];
  const seen = new Map(origRes.map(r => [r.item.id || r.item.name, r]));

  // Hinglish transliteration search (same as billing page)
  if (isQueryHindiScript) {
    const hinglish = transliterateHindiToHinglish(searchName);
    if (hinglish !== searchName) {
      for (const r of fuse.search(hinglish)) {
        const key = r.item.id || r.item.name;
        const ex = seen.get(key);
        if (!ex) { combined.push(r); seen.set(key, r); }
        else if ((r.score ?? 1) < (ex.score ?? 1)) ex.score = r.score;
      }
    }
  } else {
    const hindi = transliterateHinglishToHindi(searchName);
    if (hindi !== searchName.toLowerCase()) {
      for (const r of fuse.search(hindi)) {
        const key = r.item.id || r.item.name;
        const ex = seen.get(key);
        if (!ex) { combined.push(r); seen.set(key, r); }
        else if ((r.score ?? 1) < (ex.score ?? 1)) ex.score = r.score;
      }
    }
  }

  const topCombined = combined
    .slice().sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
    .slice(0, TOP_N);

  const isQueryHindi = /[\u0900-\u097F]/.test(searchName);

  const scored = topCombined.map(r => {
    const cand = r.item;
    const querySyl = countSyllables(isQueryHindi ? searchName : transliterateHinglishToHindi(searchName));
    const matchSyl = getSyllablesFn(searchName, cand);
    const penRaw = (querySyl > 0 && matchSyl > 0)
      ? Math.abs(querySyl - matchSyl) / Math.max(querySyl, matchSyl)
      : 0;
    const penalty = penRaw * 0.8;
    const finalScore = (r.score ?? 1) + penalty;
    return { item: cand, rawScore: r.score ?? 1, querySyl, matchSyl, penalty, finalScore };
  });

  scored.sort((a, b) => a.finalScore - b.finalScore);
  return scored;
}

// ── parseVoiceItems minimal simulator ────────────────────────────────────────
// Handles: quantity word extraction, unit extraction, searchName cleaning.
function parseAndExtract(voiceText) {
  // Apply billing-page normalization (lookbehind for दो/तीन etc.)
  let text = voiceText.toLowerCase().trim()
    .replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(do|दो)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/gi, ' 2 ')
    .replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(teen|तीन)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/gi, ' 3 ')
    .replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(char|चार)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/gi, ' 4 ')
    .replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(paanch|पांच)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/gi, ' 5 ');

  const unitMap = { packet: 'pc', pkt: 'pc', pack: 'pc', 'पैकेट': 'pc', 'पीस': 'pc', pc: 'pc', pcs: 'pc',
                    kg: 'kg', kilo: 'kg', 'किलो': 'kg', g: 'g', gram: 'g', 'ग्राम': 'g',
                    l: 'l', liter: 'l', 'लीटर': 'l', ml: 'ml' };
  const numMap = { 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5 };

  const tokens = text.split(/\s+/).filter(w => w.length > 0);
  const nameWords = [];
  let qty = 1;
  let unit = 'pc';
  let i = 0;
  while (i < tokens.length) {
    const w = tokens[i];
    const asNum = !isNaN(Number(w)) ? parseFloat(w) : (numMap[w] !== undefined ? numMap[w] : null);
    if (asNum !== null) {
      qty = asNum;
      const nextW = tokens[i + 1] || '';
      if (unitMap[nextW]) { unit = unitMap[nextW]; i += 2; continue; }
      i++; continue;
    }
    if (unitMap[w] && nameWords.length === 0) { unit = unitMap[w]; i++; continue; }
    nameWords.push(w);
    i++;
  }

  const rawName = nameWords.join(' ');
  // searchName: strip residual digits and standalone unit keywords only
  // Use word-boundary anchors that work for Latin; for standalone single-letter
  // units (g, l, m) require surrounding spaces to avoid stripping "g" from "parle-g".
  const searchName = rawName
    .replace(/\d+/g, '')
    .replace(/\b(kg|ml|ltr|pcs?|pieces?|pkt|pack|packet|day|meter)\b/gi, '')
    .replace(/(^|\s)(g|l|m)(\s|$)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { searchName: searchName || rawName, qty, unit };
}

// ── Test runner ───────────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;
const results = [];

function productMatches(winner, expected) {
  if (!expected) return true;
  return winner === expected
    || winner.toLowerCase().startsWith(expected.toLowerCase())
    || expected.toLowerCase().startsWith(winner.toLowerCase());
}

function runTest({ label, voiceInput, expectedProduct, expectedQty, expectedUnit }) {
  const { searchName, qty, unit } = parseAndExtract(voiceInput);
  const buggyRanking  = scoreQuery(searchName, getClosestWordSyllableCount_BUGGY);
  const fixedRanking  = scoreQuery(searchName, getClosestWordSyllableCount_FIXED);

  const buggyWinner = buggyRanking.length && buggyRanking[0].finalScore <= 0.6
    ? buggyRanking[0].item.name : '(no match)';
  const fixedWinner = fixedRanking.length && fixedRanking[0].finalScore <= 0.6
    ? fixedRanking[0].item.name : '(no match)';

  const productPass = productMatches(fixedWinner, expectedProduct);
  const qtyPass     = expectedQty  === undefined || qty  === expectedQty;
  const unitPass    = expectedUnit === undefined || unit === expectedUnit;
  const pass        = productPass && qtyPass && unitPass;

  if (pass) passCount++; else failCount++;

  results.push({ label, voiceInput, searchName, qty, unit,
                 buggyWinner, fixedWinner, expectedProduct, expectedQty, expectedUnit,
                 pass, buggyRanking, fixedRanking });
  return { buggyRanking, fixedRanking };
}

// ── Test cases ────────────────────────────────────────────────────────────────

const tests = [
  // ── The two original failures ──────────────────────────────────────────────
  {
    label:           'Trace 2 — exact brand query',
    voiceInput:      'पारले-जी बिस्कुट',
    expectedProduct: 'Parle-G Biscuit',
  },
  {
    label:           'Trace 1 — ASR degraded + quantity',
    voiceInput:      'परले-ग बिस्किट दो पैकेट',
    expectedProduct: 'Parle-G Biscuit',
    expectedQty:     2,
    expectedUnit:    'pc',
  },
  // ── Required additional variants ──────────────────────────────────────────
  {
    label:           'Hindi with space instead of hyphen',
    voiceInput:      'पारले जी बिस्किट',
    expectedProduct: 'Parle-G Biscuit',
  },
  {
    label:           'English parle-g',
    voiceInput:      'parle-g biscuit',
    expectedProduct: 'Parle-G Biscuit',
  },
  {
    label:           'ASR variant परले-ग (no quantity)',
    voiceInput:      'परले-ग बिस्किट',
    expectedProduct: 'Parle-G Biscuit',
  },
  // ── Regression: unrelated products should not be disrupted ────────────────
  {
    label:           'Regression — Surf Excel detergent',
    voiceInput:      'surf excel',
    expectedProduct: 'Surf Excel',
  },
  {
    label:           'Regression — Lifebuoy soap',
    voiceInput:      'lifebuoy soap',
    expectedProduct: 'Lifebuoy',
  },
  {
    label:           'Regression — KrackJack should NOT win on Parle-G query',
    voiceInput:      'पारले-जी बिस्कुट',
    expectedProduct: 'Parle-G Biscuit',
  },
  // ── Verify other hyphenated-name catalog products still score correctly ────
  // These have hyphens in their names (like Parle-G). The fix must not break them.
  {
    label:           'Hyphenated catalog — Medimix Soap',
    voiceInput:      'medimix soap',
    expectedProduct: 'Medimix',
  },
  {
    label:           'Hyphenated catalog — Saffola Gold oil',
    voiceInput:      'saffola gold oil',
    expectedProduct: 'Saffola',
  },
  {
    label:           'Hyphenated catalog — Parle Bourbon not confused with Parle-G',
    voiceInput:      'parle bourbon biscuit',
    expectedProduct: 'Parle Bourbon',
  },
];

for (const t of tests) runTest(t);

// ── Output ────────────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════════════════════');
console.log('  PARLE-G REGRESSION TEST SUITE');
console.log('══════════════════════════════════════════════════════════════════\n');

for (const r of results) {
  const icon = r.pass ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon}  ${r.label}`);
  console.log(`  Voice input:    "${r.voiceInput}"`);
  console.log(`  searchName:     "${r.searchName}"  qty=${r.qty}  unit=${r.unit}`);
  console.log(`  BEFORE fix:     "${r.buggyWinner}"`);
  console.log(`  AFTER  fix:     "${r.fixedWinner}"`);
  if (r.expectedQty !== undefined) {
    const qIcon = r.qty === r.expectedQty ? '✅' : '❌';
    const uIcon = r.unit === r.expectedUnit ? '✅' : '❌';
    console.log(`  Quantity:       ${qIcon} expected ${r.expectedQty} got ${r.qty}`);
    console.log(`  Unit:           ${uIcon} expected ${r.expectedUnit} got ${r.unit}`);
  }

  // Show top-5 scoring table for the two original failures and the ASR variant
  if (['Trace 2 — exact brand query', 'Trace 1 — ASR degraded + quantity',
       'ASR variant परले-ग (no quantity)'].includes(r.label)) {
    const pad = (s, n) => String(s).padEnd(n);
    console.log(`\n  ── BEFORE fix — top 5 candidates for "${r.searchName}" ──`);
    console.log(`  ${pad('Product',34)} ${pad('Raw',7)} ${pad('matchSyl',9)} ${pad('Penalty',9)} ${pad('Final',8)} Win?`);
    r.buggyRanking.slice(0, 5).forEach((c, i) => {
      const w = i === 0 && c.finalScore <= 0.6 ? '✅' : '';
      console.log(`  ${pad(c.item.name,34)} ${pad(c.rawScore.toFixed(4),7)} ${pad(c.matchSyl,9)} ${pad(c.penalty.toFixed(4),9)} ${pad(c.finalScore.toFixed(4),8)} ${w}`);
    });

    console.log(`\n  ── AFTER  fix — top 5 candidates for "${r.searchName}" ──`);
    console.log(`  ${pad('Product',34)} ${pad('Raw',7)} ${pad('matchSyl',9)} ${pad('Penalty',9)} ${pad('Final',8)} Win?`);
    r.fixedRanking.slice(0, 5).forEach((c, i) => {
      const w = i === 0 && c.finalScore <= 0.6 ? '✅' : '';
      console.log(`  ${pad(c.item.name,34)} ${pad(c.rawScore.toFixed(4),7)} ${pad(c.matchSyl,9)} ${pad(c.penalty.toFixed(4),9)} ${pad(c.finalScore.toFixed(4),8)} ${w}`);
    });
  }
  console.log();
}

console.log('══════════════════════════════════════════════════════════════════');
console.log(`  Results: ${passCount} passed, ${failCount} failed`);
console.log('══════════════════════════════════════════════════════════════════\n');

if (failCount > 0) process.exit(1);
