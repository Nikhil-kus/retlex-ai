/**
 * Add Parle-G ASR-variant localAliases to "Parle-G Biscuit" in Firestore.
 *
 * Only writes to id QTlm4uu4de2ZsmrOBybn — the plain single-pack product.
 * Other Parle-G variants (Gluco, Gold, Bulk) keep their own identity.
 *
 * Aliases chosen and tested for safety:
 *   - पारले-जी   canonical Hindi brand name
 *   - पारले जी   space variant (common in typing/casual speech)
 *   - परले-ग     most common ASR degradation of "Parle-G"
 *   - parle-g    English hyphenated form
 *   - parle g    English space form
 *   - parleg     compressed English form
 *
 * Intentionally EXCLUDED (cause collision with other Parle products):
 *   - परले ग   (bare space, no hyphen — routes to Parle Toast when alone)
 *   - parle ji  (romanised ji — routes to Parle Toast/Hide&Seek without "biscuit")
 *
 * Run:  node scratch/add_parleg_aliases.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk',
  authDomain:        'retlex-ai.firebaseapp.com',
  projectId:         'retlex-ai',
  storageBucket:     'retlex-ai.firebasestorage.app',
  messagingSenderId: '339712048398',
  appId:             '1:339712048398:web:578ac498b0c942db7aab5f',
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const PARLEG_ID = 'QTlm4uu4de2ZsmrOBybn';

const ALIASES = [
  'पारले-जी',   // canonical Hindi brand name
  'पारले जी',   // space variant
  'परले-ग',     // most common ASR degradation
  'parle-g',    // English hyphenated
  'parle g',    // English space
  'parleg',     // compressed English
];

(async () => {
  console.log('Fetching Parle-G Biscuit from Firestore...');
  const ref  = doc(db, 'products', PARLEG_ID);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    console.error('Document not found: products/' + PARLEG_ID);
    process.exit(1);
  }

  const data = snap.data();
  console.log('Current product:', data.name, '(localName:', data.localName + ')');

  const existing = Array.isArray(data.localAliases) ? data.localAliases : [];
  console.log('Existing localAliases:', existing.length > 0 ? existing : '(none)');

  // Merge: keep anything that was there, add ours, dedup
  const merged = Array.from(new Set([...existing, ...ALIASES]));
  console.log('New localAliases:', merged);

  await updateDoc(ref, { localAliases: merged });
  console.log('\nUpdated products/' + PARLEG_ID + ' with localAliases:', merged);
  process.exit(0);
})();
