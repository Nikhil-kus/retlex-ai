/**
 * Final verification: run full alias + collision suite with ONLY the 6 safe aliases
 * (drop "परले ग" and "parle ji" which had borderline Fuse scores against other Parle products).
 */
import Fuse from 'fuse.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(__dirname, '..', 'krishna-products-catalog.json'), 'utf8'));

// Only 6 aliases — "परले ग" and "parle ji" removed
const SAFE_ALIASES = [
  'पारले-जी',   // canonical Hindi brand
  'पारले जी',   // space variant (common voice)
  'परले-ग',     // most common ASR degradation
  'parle-g',    // English hyphenated
  'parle g',    // English space
  'parleg',     // compressed English
];

const cat = catalog.map(p =>
  p.id === 'QTlm4uu4de2ZsmrOBybn'
    ? { ...p, localAliases: SAFE_ALIASES }
    : { ...p, localAliases: p.localAliases || [] }
);
const fuse = new Fuse(cat, {
  keys: ['name', 'localName', 'localAliases'],
  threshold: 0.6, includeScore: true, ignoreLocation: true, minMatchCharLength: 2
});

let pass = 0, fail = 0;

function check(label, q, want) {
  const top = fuse.search(q).slice(0, 3);
  const got = top[0] && top[0].score <= 0.6 ? top[0].item.name : '(no match)';
  const ok = got.toLowerCase().includes(want.toLowerCase());
  if (ok) pass++; else fail++;
  const tag = ok ? 'OK' : '!!';
  console.log('  ' + tag + '  "' + q + '" -> "' + got + '"' + (!ok ? '  expected "' + want + '" <-- FAIL' : ''));
}

console.log('\nGroup 1 — Parle-G target queries\n');
check('exact Hindi',          'पारले-जी बिस्कुट',       'Parle-G Biscuit');
check('ASR degraded',         'परले-ग बिस्किट',          'Parle-G Biscuit');
check('ASR+qty searchName',   'परले-ग बिस्किट',          'Parle-G Biscuit');
check('Hindi space variant',  'पारले जी बिस्किट',        'Parle-G Biscuit');
check('English parle-g',      'parle-g biscuit',          'Parle-G Biscuit');
check('English parle g',      'parle g biscuit',          'Parle-G Biscuit');
check('Compressed parleg',    'parleg biscuit',            'Parle-G Biscuit');

console.log('\nGroup 2 — Collision check (other Parle products)\n');
check('Parle Bourbon',              'parle bourbon biscuit',        'Parle Bourbon');
check('Parle 50-50',                'parle 50-50',                  'Parle 50-50');
check('Parle Hide Seek',            'parle hide seek',              'Parle Hide');
check('Parle Hide Seek full',       'parle hide and seek biscuit',  'Parle Hide');
check('Parle Toast',                'parle toast',                  'Parle Toast');
check('Parle 20-20',                'parle 20-20',                  'Parle 20-20');
check('Parle-G Gluco (specific)',   'parle-g gluco biscuit',        'Parle-G Gluco');
check('Parle-G Gold (specific)',    'parle-g gold biscuit',         'Parle-G Gold');
check('KrackJack',                  'krackjack biscuit',            'KrackJack');
check('KrackJack Hindi',            'क्रैकजैक बिस्किट',             'KrackJack');
check('Patanjali Biscuit',          'patanjali biscuit',            'Patanjali');

console.log('\n  ' + pass + ' / ' + (pass+fail) + ' passed.\n');
if (fail > 0) process.exit(1);
