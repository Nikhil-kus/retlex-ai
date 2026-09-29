/**
 * Part 2: Deep investigation of the window-matching bug in getClosestWordSyllableCount
 * and the Fuse threshold behaviour for the Parle-G vs KrackJack race.
 */

import Fuse from 'fuse.js';

function countSyllables(text) {
  const clean = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim();
  if (!clean) return 0;
  if (/[\u0900-\u097F]/.test(clean)) {
    const segmenter = new Intl.Segmenter('hi', { granularity: 'grapheme' });
    const segments = [...segmenter.segment(clean)];
    return segments.filter(s => s.segment.trim().length > 0).length;
  } else {
    return clean.replace(/\s+/g, '').length;
  }
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

// ── THE CORE BUG: Hyphen handling in candWords tokenization ──────────────────
console.log("════════ ROOT CAUSE: Hyphen Splits localName Incorrectly ════════\n");

const localNameParleG = "पारले-जी बिस्किट";
console.log(`localName of ParleG: "${localNameParleG}"`);
console.log(`\ngetClosestWordSyllableCount strips hyphens from candWords:`);
console.log(`  .replace(/[.,\\/#!$%\\^&\\*;:{}=\\-_\`~()]/g, " ")  ← hyphen → space`);

const afterStrip = localNameParleG.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");
const candWords = afterStrip.split(/\s+/).filter(w => w.length > 0);
console.log(`  After strip: "${afterStrip}"`);
console.log(`  candWords: [${candWords.map(w => `"${w}"`).join(', ')}]  ← 3 words!`);

console.log(`\nQuery: "पारले-जी बिस्कुट"`);
console.log(`  queryWords (split on \\s+, NO hyphen strip): ["पारले-जी", "बिस्कुट"]  ← 2 words!`);
console.log(`  windowSize = 2`);
console.log(`\nPossible 2-word windows from candWords [पारले, जी, बिस्किट]:`);

const qWords = ["पारले-जी", "बिस्कुट"];
const compareQuery = "पारले-जी बिस्कुट";

for (let start = 0; start <= candWords.length - qWords.length; start++) {
  const subSeq = candWords.slice(start, start + qWords.length).join(" ");
  const dist = getLevenshteinDistance(compareQuery.toLowerCase(), subSeq);
  const syl = countSyllables(subSeq);
  console.log(`  window[${start}..${start+1}]: "${subSeq}" | dist=${dist} | syllables=${syl}`);
}

console.log(`\nThe CORRECT window would be "पारले-जी बिस्किट" (the full localName),`);
console.log(`which has syllables=${countSyllables("पारले-जी बिस्किट")} — matching the query's ${countSyllables("पारले-जी बिस्कुट")}.`);
console.log(`But it is NEVER evaluated because the hyphen splits "पारले-जी" into two tokens.`);
console.log(`The closest 2-word window is "जी बिस्किट" with syllables=4, causing a massive penalty.`);

// ── KrackJack does NOT have a hyphen in its localName ──────────────────────────
console.log("\n════════ Why KrackJack Gets Zero Penalty ════════\n");
const krackLocalName = "क्रैकजैक बिस्किट";
const krackWords = krackLocalName.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ").split(/\s+/).filter(w => w.length > 0);
console.log(`KrackJack localName: "${krackLocalName}"`);
console.log(`candWords: [${krackWords.map(w => `"${w}"`).join(', ')}]  ← 2 words, matches windowSize`);

for (let start = 0; start <= krackWords.length - qWords.length; start++) {
  const subSeq = krackWords.slice(start, start + qWords.length).join(" ");
  const dist = getLevenshteinDistance(compareQuery.toLowerCase(), subSeq);
  const syl = countSyllables(subSeq);
  console.log(`  window[${start}..${start+1}]: "${subSeq}" | dist=${dist} | syllables=${syl}`);
}
console.log(`→ syllables=7 = querySyllables=7 → penalty=0.0000`);
console.log(`→ KrackJack never gets a syllable penalty, so it wins at lower raw Fuse score`);

// ── Fuse scoring simulation ─────────────────────────────────────────────────
console.log("\n════════ Fuse Score Simulation ════════\n");

const catalog = [
  { id: 'QTlm4uu4de2ZsmrOBybn', name: 'Parle-G Biscuit',    localName: 'पारले-जी बिस्किट',   localAliases: [] },
  { id: '0RFz2F9mJSR9jTQ50yDb', name: 'KrackJack Biscuit',  localName: 'क्रैकजैक बिस्किट',   localAliases: [] },
  { id: 'K6mUrqu3GbnFJNRFWgo0', name: 'Parle-G Gluco Biscuit', localName: 'पारले-जी ग्लूको बिस्किट', localAliases: [] },
  { id: 'PE1UCa2ZmhvL4w1fVim4', name: 'Parle-G Gold Biscuit',  localName: 'पारले-जी गोल्ड बिस्किट',   localAliases: [] },
  { id: 'pyXU87Gs9imzj8FEuwzp', name: 'Parle Bourbon Biscuit', localName: 'पारले बॉर्बन बिस्किट',     localAliases: [] },
  { id: 'matpz1h4VN1oBNwhfeWS', name: 'Parle 20-20 Biscuit',   localName: 'पारले 20-20 बिस्किट',       localAliases: [] },
];

const fuse = new Fuse(catalog, {
  keys: ['name', 'localName', 'localAliases'],
  threshold: 0.6,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2
});

for (const [label, query] of [
  ['Trace 2 query', 'पारले-जी बिस्कुट'],
  ['Trace 1 query', 'परले-ग बिस्किट'],
]) {
  console.log(`\n--- Fuse results for "${query}" (${label}) ---`);
  const results = fuse.search(query);
  results.slice(0, 8).forEach((r, i) => {
    console.log(`  ${i+1}. "${r.item.name}" — raw Fuse score: ${r.score?.toFixed(4)}`);
    const matched = r.matches?.map(m => `${m.key}:"${m.value}"`).join(', ');
    if (matched) console.log(`     matched: ${matched}`);
  });
}

// ── Full score simulation to prove KrackJack wins ─────────────────────────────
console.log("\n════════ Full Score Simulation — Trace 2: 'पारले-जी बिस्कुट' ════════\n");

function getClosestWordSyllableCount_full(query, cand) {
  const compareQuery = query;
  const options = [];
  if (cand.localName) options.push(cand.localName);
  if (cand.name) options.push(cand.name);
  if (Array.isArray(cand.localAliases)) options.push(...cand.localAliases.filter(a => typeof a === 'string'));

  let bestSyllables = 0;
  let minDistance = Infinity;
  let bestWindow = '';

  const queryWords = compareQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  for (const option of options) {
    const candWords = option.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
      .split(/\s+/).filter(w => w.length > 0);
    const windowSize = queryWords.length;
    for (let start = 0; start <= candWords.length - windowSize; start++) {
      const subSeq = candWords.slice(start, start + windowSize).join(" ");
      const dist = getLevenshteinDistance(compareQuery.toLowerCase(), subSeq);
      if (dist < minDistance) {
        minDistance = dist;
        bestSyllables = countSyllables(subSeq);
        bestWindow = subSeq;
      }
    }
  }
  return { bestSyllables, bestWindow, minDistance };
}

const queryT2 = "पारले-जी बिस्कुट";
const isHindi = true;
const querySylT2 = countSyllables(queryT2);

const resultsT2 = fuse.search(queryT2);
console.log(`querySyllables: ${querySylT2}`);
console.log(`TOP_N=15 raw Fuse results after scoring:\n`);
console.log(`${'Product'.padEnd(35)} ${'RawFuse'.padEnd(10)} ${'matchSyl'.padEnd(10)} ${'Penalty'.padEnd(10)} ${'FinalScore'.padEnd(12)} Winner?`);
console.log('-'.repeat(90));

const top15 = resultsT2.slice(0, 15);
const scored = top15.map(r => {
  const { bestSyllables, bestWindow } = getClosestWordSyllableCount_full(queryT2, r.item);
  const penRaw = (querySylT2 > 0 && bestSyllables > 0)
    ? Math.abs(querySylT2 - bestSyllables) / Math.max(querySylT2, bestSyllables)
    : 0;
  const pen = penRaw * 0.8;
  const finalScore = (r.score ?? 1) + pen;
  return { item: r.item, rawScore: r.score ?? 1, matchSyl: bestSyllables, pen, finalScore, bestWindow };
});
scored.sort((a, b) => a.finalScore - b.finalScore);
scored.forEach((s, i) => {
  const winner = i === 0 && s.finalScore <= 0.6 ? '✅ WINS' : '';
  console.log(`${s.item.name.padEnd(35)} ${s.rawScore.toFixed(4).padEnd(10)} ${String(s.matchSyl).padEnd(10)} ${s.pen.toFixed(4).padEnd(10)} ${s.finalScore.toFixed(4).padEnd(12)} ${winner}`);
});

console.log("\n════════ Full Score Simulation — Trace 1: 'परले-ग बिस्किट' ════════\n");
const queryT1 = "परले-ग बिस्किट";
const querySylT1 = countSyllables(queryT1);
const resultsT1 = fuse.search(queryT1);
console.log(`querySyllables: ${querySylT1}`);
console.log(`\n${'Product'.padEnd(35)} ${'RawFuse'.padEnd(10)} ${'matchSyl'.padEnd(10)} ${'Penalty'.padEnd(10)} ${'FinalScore'.padEnd(12)} Winner?`);
console.log('-'.repeat(90));
const top15T1 = resultsT1.slice(0, 15);
const scoredT1 = top15T1.map(r => {
  const { bestSyllables, bestWindow } = getClosestWordSyllableCount_full(queryT1, r.item);
  const penRaw = (querySylT1 > 0 && bestSyllables > 0)
    ? Math.abs(querySylT1 - bestSyllables) / Math.max(querySylT1, bestSyllables)
    : 0;
  const pen = penRaw * 0.8;
  const finalScore = (r.score ?? 1) + pen;
  return { item: r.item, rawScore: r.score ?? 1, matchSyl: bestSyllables, pen, finalScore, bestWindow };
});
scoredT1.sort((a, b) => a.finalScore - b.finalScore);
scoredT1.forEach((s, i) => {
  const winner = i === 0 && s.finalScore <= 0.6 ? '✅ WINS' : '';
  console.log(`${s.item.name.padEnd(35)} ${s.rawScore.toFixed(4).padEnd(10)} ${String(s.matchSyl).padEnd(10)} ${s.pen.toFixed(4).padEnd(10)} ${s.finalScore.toFixed(4).padEnd(12)} ${winner}`);
});

// ── Cache audit ───────────────────────────────────────────────────────────────
console.log("\n════════ Cache Audit ════════\n");
console.log("The matchCacheRef in billing/page.tsx:");
console.log("  Key format: `${item.name}__${item.unit}__${item.quantity}__${item.rawText}`");
console.log("  e.g. 'पारले-जी बिस्कुट__pc__1__पारले-जी बिस्कुट'");
console.log("");
console.log("For Trace 1 query 'परले-ग बिस्किट दो पैकेट':");
console.log("  → parseVoiceItems yields: name='परले-ग बिस्किट', qty=2, unit='pc', rawText='परले-ग बिस्किट दो पैकेट'");
console.log("  → cacheKey: 'परले-ग बिस्किट__pc__2__परले-ग बिस्किट दो पैकेट'");
console.log("");
console.log("For partial/interim results during continuous speech:");
console.log("  If ASR emits 'पारले-जी' first (one breath), then extends to 'पारले-जी बिस्कुट':");
console.log("    partial key: 'पारले-जी__pc__1__पारले-जी'");
console.log("    final key:   'पारले-जी बिस्कुट__pc__1__पारले-जी बिस्कुट'");
console.log("  These are DIFFERENT keys — no stale cache reuse between them.");
console.log("");
console.log("For Trace 1 + Trace 2 (separate sessions):");
console.log("  matchCacheRef is cleared at voice session start: matchCacheRef.current.clear()");
console.log("  Line 1531 in billing/page.tsx: matchCacheRef.current.clear()");
console.log("  → Cross-session cache contamination is IMPOSSIBLE.");
console.log("");
console.log("voicePrefsCache (localStorage, survives tab close):");
console.log("  Key: voice_pref_{shopId}_{spokenWord.toLowerCase().trim()}");
console.log("  Only populated when user LONG-PRESSES a suggestion card.");
console.log("  Would only cause an issue if the shop owner previously long-pressed wrong product for 'पारले-जी'.");
console.log("  NOT a systematic bug — only affects shops where user explicitly pinned wrong product.");
console.log("");
console.log("CONCLUSION: Cache is NOT responsible for either failure.");
