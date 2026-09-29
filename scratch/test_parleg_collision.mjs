/**
 * Final collision check: all 8 proposed aliases vs. queries for neighbouring Parle products.
 * A collision = a user asking for Parle Bourbon/Toast/50-50 etc. gets Parle-G Biscuit instead.
 */
import Fuse from 'fuse.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(__dirname, '..', 'krishna-products-catalog.json'), 'utf8'));

const ALL_ALIASES = [
  '\u092a\u093e\u0930\u0932\u0947-\u091c\u0940',   // पारले-जी
  '\u092a\u093e\u0930\u0932\u0947 \u091c\u0940',    // पारले जी
  '\u092a\u0930\u0932\u0947-\u0917',                // परले-ग
  '\u092a\u0930\u0932\u0947 \u0917',                // परले ग
  'parle-g', 'parle g', 'parle ji', 'parleg'
];

const cat = catalog.map(p =>
  p.id === 'QTlm4uu4de2ZsmrOBybn'
    ? { ...p, localAliases: ALL_ALIASES }
    : { ...p, localAliases: p.localAliases || [] }
);
const fuse = new Fuse(cat, {
  keys: ['name', 'localName', 'localAliases'],
  threshold: 0.6, includeScore: true, ignoreLocation: true, minMatchCharLength: 2
});

// Queries a user might say intending a non-Parle-G product
const tests = [
  { q: 'parle bourbon',               want: 'Parle Bourbon' },
  { q: 'parle bourbon biscuit',       want: 'Parle Bourbon' },
  { q: 'parle 50-50',                 want: 'Parle 50-50' },
  { q: 'parle hide seek',             want: 'Parle Hide' },
  { q: 'parle hide and seek biscuit', want: 'Parle Hide' },
  { q: 'parle toast',                 want: 'Parle Toast' },
  { q: 'parle 20-20',                 want: 'Parle 20-20' },
  { q: 'parle gluco biscuit',         want: 'Parle-G Gluco' },
  { q: 'parle gold biscuit',          want: 'Parle-G Gold' },
  { q: 'parle-g gluco',               want: 'Parle-G Gluco' },
  { q: 'parle-g gold',                want: 'Parle-G Gold' },
];

let pass = 0, fail = 0;
console.log('\nCollision check — do aliases steal queries for OTHER Parle products?\n');
for (const t of tests) {
  const top = fuse.search(t.q).slice(0, 3);
  const got = top[0] && top[0].score <= 0.6 ? top[0].item.name : '(no match)';
  const ok = got.toLowerCase().includes(t.want.toLowerCase());
  if (ok) pass++; else fail++;
  console.log((ok ? '  OK' : '  !!') + '  "' + t.q + '"');
  console.log('       want: starts-with "' + t.want + '"   got: "' + got + '"' + (!ok ? ' <-- COLLISION' : ''));
  top.forEach((r, i) => console.log('       ' + (i+1) + '. "' + r.item.name + '" score=' + r.score?.toFixed(4)));
  console.log();
}
console.log(pass + ' / ' + (pass + fail) + ' passed. ' + (fail === 0 ? 'No collisions.' : fail + ' COLLISIONS found.'));
if (fail > 0) process.exit(1);
