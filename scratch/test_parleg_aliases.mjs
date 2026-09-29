/**
 * Alias safety analysis for Parle-G ASR variants.
 *
 * Tests proposed localAliases against the full catalog to check:
 *   1. Each alias makes Parle-G Biscuit (QTlm4uu4de2ZsmrOBybn) win on the
 *      target queries.
 *   2. No alias causes unrelated products (Parle Bourbon, Parle 50-50,
 *      KrackJack, Patanjali Biscuit, etc.) to lose on their own queries.
 *   3. No alias causes a Parle-G product to win when the user asks for a
 *      different Parle product.
 *
 * Run:  node scratch/test_parleg_aliases.mjs
 */

import Fuse from 'fuse.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '..', 'krishna-products-catalog.json');
const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));

// ── Shared helpers ────────────────────────────────────────────────────────────
function countSyllables(text) {
  const clean = text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '').trim();
  if (!clean) return 0;
  if (/[\u0900-\u097F]/.test(clean)) {
    const segmenter = new Intl.Segmenter('hi', { granularity: 'grapheme' });
    return [...segmenter.segment(clean)].filter(s => s.segment.trim().length > 0).length;
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

const HINDI_TO_HINGLISH = { 'बिस्कुट': 'biscuit', 'बिस्किट': 'biscuit', 'पैकेट': 'packet' };
function transliterateHindiToHinglish(t) {
  return t.toLowerCase().trim().split(/\s+/).map(w => HINDI_TO_HINGLISH[w] || w).join(' ');
}
const HINGLISH_TO_HINDI = { biscuit: 'बिस्कुट', biscut: 'बिस्कुट' };
function transliterateHinglishToHindi(t) {
  return t.toLowerCase().split(/\s+/).map(w => HINGLISH_TO_HINDI[w] || w).join(' ');
}

// ── FIXED getClosestWordSyllableCount (with the hyphen-symmetry patch) ────────
function getMatchSyllables(query, cand) {
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
  const normalisedQuery = compareQuery.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
  const queryWords = normalisedQuery.split(/\s+/).filter(w => w.length > 0);
  let bestSyllables = 0, minDistance = Infinity;
  for (const option of options) {
    const candWords = option.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ').split(/\s+/).filter(w => w.length > 0);
    for (let start = 0; start <= candWords.length - queryWords.length; start++) {
      const subSeq = candWords.slice(start, start + queryWords.length).join(' ');
      const dist = getLevenshteinDistance(normalisedQuery, subSeq);
      if (dist < minDistance) { minDistance = dist; bestSyllables = countSyllables(subSeq); }
    }
  }
  return bestSyllables;
}

// ── Full scoring pipeline ─────────────────────────────────────────────────────
const TOP_N = 15;

function buildFuse(catalogWithAliases) {
  return new Fuse(catalogWithAliases, {
    keys: ['name', 'localName', 'localAliases'],
    threshold: 0.6,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
}

function scoreQuery(searchName, fuse, catalogWithAliases) {
  const isQueryHindiScript = /[\u0900-\u097F]/.test(searchName);
  let combined = [...fuse.search(searchName)];
  const seen = new Map(combined.map(r => [r.item.id || r.item.name, r]));

  if (isQueryHindiScript) {
    const hinglish = transliterateHindiToHinglish(searchName);
    if (hinglish !== searchName) {
      for (const r of fuse.search(hinglish)) {
        const k = r.item.id || r.item.name;
        const ex = seen.get(k);
        if (!ex) { combined.push(r); seen.set(k, r); }
        else if ((r.score ?? 1) < (ex.score ?? 1)) ex.score = r.score;
      }
    }
  } else {
    const hindi = transliterateHinglishToHindi(searchName);
    if (hindi !== searchName.toLowerCase()) {
      for (const r of fuse.search(hindi)) {
        const k = r.item.id || r.item.name;
        const ex = seen.get(k);
        if (!ex) { combined.push(r); seen.set(k, r); }
        else if ((r.score ?? 1) < (ex.score ?? 1)) ex.score = r.score;
      }
    }
  }

  const topN = combined.slice().sort((a, b) => (a.score ?? 1) - (b.score ?? 1)).slice(0, TOP_N);
  const isQueryHindi = /[\u0900-\u097F]/.test(searchName);

  const scored = topN.map(r => {
    const cand = r.item;
    const querySyl = countSyllables(isQueryHindi ? searchName : transliterateHinglishToHindi(searchName));
    const matchSyl = getMatchSyllables(searchName, cand);
    const penRaw = (querySyl > 0 && matchSyl > 0) ? Math.abs(querySyl - matchSyl) / Math.max(querySyl, matchSyl) : 0;
    const penalty = penRaw * 0.8;
    const finalScore = (r.score ?? 1) + penalty;
    return { item: cand, rawScore: r.score ?? 1, querySyl, matchSyl, penalty, finalScore };
  });
  scored.sort((a, b) => a.finalScore - b.finalScore);
  return scored;
}

function winner(scored) {
  return scored.length && scored[0].finalScore <= 0.6 ? scored[0].item.name : '(no match)';
}

// ── Proposed aliases ──────────────────────────────────────────────────────────
// We propose adding these ONLY to "Parle-G Biscuit" (id QTlm4uu4de2ZsmrOBybn).
// NOT to Gluco, Gold, or Bulk variants — those have their own identity.
const PROPOSED_ALIASES = [
  'पारले-जी',       // canonical Hindi brand name
  'पारले जी',       // space variant (common in typing/casual speech)
  'परले-ग',         // most common ASR degradation
  'परले ग',         // space variant of ASR form
  'parle-g',        // English hyphenated form
  'parle g',        // English space form
  'parle ji',       // romanized ji form
  'parleg',         // compressed English form
];

// Build catalogs: without aliases and with aliases for id QTlm4uu4de2ZsmrOBybn
const catalogWithout = catalog.map(p => ({ ...p, localAliases: p.localAliases || [] }));
const catalogWith = catalogWithout.map(p =>
  p.id === 'QTlm4uu4de2ZsmrOBybn'
    ? { ...p, localAliases: PROPOSED_ALIASES }
    : p
);

const fuseWithout = buildFuse(catalogWithout);
const fuseWith    = buildFuse(catalogWith);

// ── TEST GROUP 1: Target queries — should win with Parle-G Biscuit ────────────
const targetTests = [
  { label: 'Trace 2 (exact brand)',        query: 'पारले-जी बिस्कुट' },
  { label: 'Trace 1 (ASR degraded)',       query: 'परले-ग बिस्किट' },
  { label: 'ASR + quantity (searchName)',  query: 'परले-ग बिस्किट' },   // qty already stripped
  { label: 'Hindi space variant',          query: 'पारले जी बिस्किट' },
  { label: 'English parle-g',              query: 'parle-g biscuit' },
  { label: 'English parle g',              query: 'parle g biscuit' },
];

// ── TEST GROUP 2: Nearby Parle products — must NOT be stolen by aliases ───────
const nearbyTests = [
  { label: 'Parle Bourbon',    query: 'parle bourbon biscuit',     expected: 'Parle Bourbon' },
  { label: 'Parle 20-20',      query: 'parle 20-20 biscuit',       expected: 'Parle 20-20' },
  { label: 'KrackJack',        query: 'krackjack biscuit',         expected: 'KrackJack' },
  { label: 'KrackJack Hindi',  query: 'क्रैकजैक बिस्किट',         expected: 'KrackJack' },
  { label: 'Parle Hide Seek',  query: 'parle hide seek biscuit',   expected: 'Parle Hide' },
  { label: 'Parle Toast',      query: 'parle toast',               expected: 'Parle Toast' },
  { label: 'Parle-G Gluco',    query: 'parle-g gluco biscuit',     expected: 'Parle-G Gluco' },
  { label: 'Parle-G Gold',     query: 'parle-g gold biscuit',      expected: 'Parle-G Gold' },
  { label: 'Patanjali Biscuit',query: 'patanjali biscuit',         expected: 'Patanjali' },
];

// ── Print helpers ─────────────────────────────────────────────────────────────
const pad = (s, n) => String(s).padEnd(n);

function printTable(scored, count = 5) {
  console.log(`  ${pad('Product', 38)} ${pad('Raw', 7)} ${pad('mSyl', 5)} ${pad('Pen', 7)} ${pad('Final', 7)} Win?`);
  scored.slice(0, count).forEach((c, i) => {
    const w = i === 0 && c.finalScore <= 0.6 ? '✅' : '';
    console.log(`  ${pad(c.item.name, 38)} ${pad(c.rawScore.toFixed(4), 7)} ${pad(c.matchSyl, 5)} ${pad(c.penalty.toFixed(4), 7)} ${pad(c.finalScore.toFixed(4), 7)} ${w}`);
  });
}

// ── Run group 1 ───────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════════════');
console.log('  GROUP 1 — Target queries: Parle-G should win');
console.log('══════════════════════════════════════════════════════════════════════\n');

let pass1 = 0, fail1 = 0;
for (const t of targetTests) {
  const without = scoreQuery(t.query, fuseWithout, catalogWithout);
  const withA   = scoreQuery(t.query, fuseWith,    catalogWith);
  const wBefore = winner(without);
  const wAfter  = winner(withA);
  const isParleG = wAfter.startsWith('Parle-G Biscuit') || wAfter === 'Parle-G Biscuit';
  const icon = isParleG ? '✅ PASS' : '❌ FAIL';
  if (isParleG) pass1++; else fail1++;

  console.log(`${icon}  ${t.label}`);
  console.log(`  query: "${t.query}"`);
  console.log(`  BEFORE aliases: "${wBefore}"  →  AFTER aliases: "${wAfter}"`);
  if (!isParleG || wBefore !== wAfter) {
    console.log('  ── AFTER top-5 ──');
    printTable(withA);
  }
  console.log();
}

// ── Run group 2 ───────────────────────────────────────────────────────────────
console.log('══════════════════════════════════════════════════════════════════════');
console.log('  GROUP 2 — Nearby products: aliases must NOT steal their queries');
console.log('══════════════════════════════════════════════════════════════════════\n');

let pass2 = 0, fail2 = 0;
for (const t of nearbyTests) {
  const without = scoreQuery(t.query, fuseWithout, catalogWithout);
  const withA   = scoreQuery(t.query, fuseWith,    catalogWith);
  const wBefore = winner(without);
  const wAfter  = winner(withA);
  // Pass if after-winner starts with expected (prefix match)
  const ok = wAfter.toLowerCase().startsWith(t.expected.toLowerCase()) ||
             t.expected.toLowerCase().startsWith(wAfter.split(' ').slice(0,2).join(' ').toLowerCase());
  // Fail if winner changed to a Parle-G product (alias collision)
  const stolen = !ok && wAfter.includes('Parle-G Biscuit');
  const icon = ok ? '✅ PASS' : '❌ FAIL';
  if (ok) pass2++; else fail2++;

  console.log(`${icon}  ${t.label}`);
  console.log(`  query: "${t.query}"  expected: starts with "${t.expected}"`);
  if (wBefore !== wAfter) {
    console.log(`  BEFORE: "${wBefore}"  →  AFTER: "${wAfter}"${stolen ? ' ← ⚠️ ALIAS COLLISION' : ''}`);
    console.log('  ── AFTER top-5 ──');
    printTable(withA);
  } else {
    console.log(`  BEFORE = AFTER = "${wAfter}" (unchanged)`);
  }
  console.log();
}

// ── Per-alias Fuse score analysis ─────────────────────────────────────────────
console.log('══════════════════════════════════════════════════════════════════════');
console.log('  ALIAS ANALYSIS — What each alias scores against the catalog');
console.log('══════════════════════════════════════════════════════════════════════\n');

console.log('For each proposed alias, top-3 catalog matches (without the alias added):\n');
const baseFuse = buildFuse(catalogWithout);
for (const alias of PROPOSED_ALIASES) {
  const results = baseFuse.search(alias).slice(0, 3);
  console.log(`  alias: "${alias}"`);
  results.forEach((r, i) => {
    const matchField = r.matches?.[0]?.key ?? '—';
    const matchVal   = String(r.matches?.[0]?.value ?? '—').slice(0, 45);
    console.log(`    ${i+1}. "${r.item.name}" (score=${r.score?.toFixed(4)}, field=${matchField}, val="${matchVal}")`);
  });
  console.log();
}

// ── Summary ───────────────────────────────────────────────────────────────────
const totalPass = pass1 + pass2;
const totalFail = fail1 + fail2;
console.log('══════════════════════════════════════════════════════════════════════');
console.log(`  Group 1 (target queries):  ${pass1} pass / ${fail1} fail`);
console.log(`  Group 2 (no-steal check):  ${pass2} pass / ${fail2} fail`);
console.log(`  Total: ${totalPass} pass / ${totalFail} fail`);
console.log('══════════════════════════════════════════════════════════════════════\n');

if (totalFail > 0) process.exit(1);
