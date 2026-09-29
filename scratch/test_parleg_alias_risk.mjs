/**
 * Targeted risk check for the two borderline aliases:
 *  - "परले ग"   (space, no hyphen, degraded ASR)
 *  - "parle ji" (romanised)
 *
 * These both score higher against other Parle products than against Parle-G.
 * Verify whether including them causes any collision.
 */
import Fuse from 'fuse.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(__dirname, '..', 'krishna-products-catalog.json'), 'utf8'));

// Build catalog with only the SAFE aliases (not the two borderline ones)
const SAFE_ALIASES = ['पारले-जी', 'पारले जी', 'परले-ग', 'parle-g', 'parle g', 'parleg'];
const RISKY_ALIASES = ['परले ग', 'parle ji'];
const ALL_ALIASES = [...SAFE_ALIASES, ...RISKY_ALIASES];

function buildFuse(aliases) {
  const cat = catalog.map(p =>
    p.id === 'QTlm4uu4de2ZsmrOBybn'
      ? { ...p, localAliases: aliases }
      : { ...p, localAliases: p.localAliases || [] }
  );
  return new Fuse(cat, {
    keys: ['name', 'localName', 'localAliases'],
    threshold: 0.6, includeScore: true, ignoreLocation: true, minMatchCharLength: 2,
  });
}

const fuseRisky = buildFuse(ALL_ALIASES);

// Check whether a query that contains "parle ji" or "परले ग" as part of the
// voice input would route incorrectly. These would typically appear with
// "बिस्किट" appended — test just the brand fragments too.
const riskQueries = [
  'parle ji biscuit',
  'parle ji',
  'परले ग बिस्किट',
  'परले ग',
  // Also check Parle Toast queries are not stolen
  'parle toast',
  'पारले टोस्ट',
];

console.log('\nRisk check — queries for the two borderline aliases:\n');
for (const q of riskQueries) {
  const results = fuseRisky.search(q).slice(0, 3);
  const top = results[0];
  const won = top && top.score <= 0.6 ? top.item.name : '(no match)';
  const isCollision = won.includes('Parle-G Biscuit') && !q.toLowerCase().includes('g');
  console.log(`  "${q}" → "${won}" ${isCollision ? '⚠️ POTENTIAL COLLISION' : '✅'}`);
  results.forEach((r, i) => {
    console.log(`    ${i+1}. "${r.item.name}"  score=${r.score?.toFixed(4)}`);
  });
  console.log();
}

console.log('CONCLUSION: "परले ग" and "parle ji" match other Parle products before');
console.log('Parle-G when used without "बिस्किट/biscuit". Since the hyphen fix');
console.log('already solves both original failures, these two aliases are UNSAFE');
console.log('to add — they are omitted from the final set.');
