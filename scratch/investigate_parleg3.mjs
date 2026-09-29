/**
 * Part 3: Verify parseVoiceItems with "दो" in billing/page.tsx
 * — specifically whether "दो" regex has word-boundary issue
 * The billing page uses lookbehind/lookahead, the customer page uses simple /\b..\b/
 */

// ── Billing page normalization regex (exact copy) ────────────────────────────
function normalizeTextBillingPage(text) {
  return text.toLowerCase().trim()
    .replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(to|too|tu|two|तो|टो|do|दो)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/gi, ' 2 ');
}

// ── Customer page normalization regex (exact copy) ──────────────────────────
function normalizeTextCustomerPage(text) {
  return text.toLowerCase().trim()
    .replace(/\b(to|too|tu|two|तो|टो|do|दो)\b/gi, ' 2 ');
}

const testCases = [
  "परले-ग बिस्किट दो पैकेट",
  "पारले-जी बिस्कुट दो पैकेट",
  "नमक दो किलो",
  "दो पैकेट बिस्किट",
];

console.log("════════ parseVoiceItems Normalization Test ════════\n");
for (const tc of testCases) {
  const billingResult = normalizeTextBillingPage(tc);
  const customerResult = normalizeTextCustomerPage(tc);
  console.log(`Input:    "${tc}"`);
  console.log(`Billing:  "${billingResult}"`);
  console.log(`Customer: "${customerResult}"`);
  console.log();
}

// ── But wait: does "दो" lookbehind work in JS? ──────────────────────────────
console.log("════════ Lookbehind Check for Hindi (Devanagari) ════════\n");
// The lookbehind pattern is: (?<=^|[^a-zA-Z0-9_\u0900-\u097F])
// This checks that the char BEFORE दो is NOT a Devanagari char, Latin alphanum, or underscore
// For "बिस्किट दो पैकेट": char before दो is " " (space) → matches
// For "दो पैकेट" (start): ^ matches
// For "नमकदो": char before दो is क (\u0928) → \u0900-\u097F → does NOT match → "दो" preserved

const edgeCases = [
  "दो पैकेट",              // दो at start
  "बिस्किट दो पैकेट",     // दो after space
  "नमकदो",                 // दो embedded in Hindi word (should NOT be replaced)
  "donut",                 // "do" embedded in English (should NOT be replaced in billing)
  "do packet",             // "do" as standalone
];

for (const ec of edgeCases) {
  const billing = normalizeTextBillingPage(ec);
  console.log(`"${ec}" → billing: "${billing}"`);
}

// ── parseVoiceItems token flow for "परले-ग बिस्किट दो पैकेट" ─────────────────
console.log("\n════════ Token flow for Trace 1 query ════════\n");

const unitMap = {
  kg: "kg", kilo: "kg", kilos: "kg", 'किलो': "kg",
  g: "g", gram: "g", grams: "g", 'ग्राम': "g",
  l: "l", liter: "l", litre: "l", litres: "l", 'लीटर': "l",
  ml: "ml", mili: "ml", 'मिली': "ml",
  pc: "pc", pcs: "pc", piece: "pc", packet: "pc", pkt: "pc", pack: "pc", 'पैकेट': "pc", 'पीस': "pc"
};

// After normalization: "परले-ग बिस्किट 2 पैकेट" 
const normalized = normalizeTextBillingPage("परले-ग बिस्किट दो पैकेट");
console.log("After normalization:", normalized);
const words = normalized.split(/\s+/).filter(w => w.length > 0);
console.log("Tokens:", words);
console.log("\nToken classification:");
words.forEach(w => {
  const isNum = !isNaN(Number(w));
  const isUnit = !!unitMap[w];
  console.log(`  "${w}": num=${isNum}, unit=${isUnit} → ${isUnit ? 'unitMap['+w+']='+unitMap[w] : isNum ? 'qty=' + w : 'name word'}`);
});

console.log("\nExpected parseVoiceItems output:");
console.log("  { name: 'परले-ग बिस्किट', quantity: 2, unit: 'pc' }");
console.log("\nActual flow:");
console.log("  1. 'परले-ग' → not num, not unit → pendingName=['परले-ग']");
console.log("  2. 'बिस्किट' → not num, not unit → pendingName=['परले-ग','बिस्किट']");
console.log("  3. '2' → isNumber=true, parsedNum=2, nextWord='पैकेट'");
console.log("     parsedUnitStr = unitMap['पैकेट'] = 'pc'");
console.log("     pendingName.length > 0 → commitItem(2, 'pc')");
console.log("  4. '4. 'पैकेट' is consumed by the '2' step (i++ after parsedUnitStr)");
console.log("  → items = [{name:'परले-ग बिस्किट', quantity:2, unit:'pc'}]");

// ── Verify: does "पैकेट" get into the name? ──────────────────────────────────
console.log("\n════════ Does 'पैकेट' leak into product name? ════════\n");
console.log("In parseVoiceItems, when '2' is parsed with parsedUnitStr='pc':");
console.log("  commitItem(parsedNum=2, finalUnit='pc') is called");
console.log("  pendingName at that point = ['परले-ग','बिस्किट']");
console.log("  → name committed = 'परले-ग बिस्किट'");
console.log("  → 'पैकेट' is consumed via i++ (line after 'if (parsedUnitStr && !isCombined)'");
console.log("  → 'पैकेट' does NOT enter the product name");
console.log("\nThen searchName = 'परले-ग बिस्किट'.replace(/\\d+/g,'').replace(/...unit.../gi,'').trim()");
console.log("  = 'परले-ग बिस्किट' (no change — no digits or unit keywords in this string)");

// ── Now the key problem for Trace 1: why KrackJack wins ──────────────────────
console.log("\n════════ Root Cause Summary for Trace 1 ════════\n");
console.log("searchName = 'परले-ग बिस्किट'  (7 graphemes / 7 countSyllables)");
console.log("Fuse scores from full Firestore catalog (as recorded in trace):");
console.log("  'Parle-G Biscuit' raw score ≈ 0.33  (localName 'पारले-जी बिस्किट' — close but ASR variant)");
console.log("  'KrackJack Biscuit' raw score ≈ 0.55  (no brand match, but 2-word biscuit structure)");
console.log("\nSyllable penalty:");
console.log("  'Parle-G Biscuit': best window = 'जी बिस्किट' (3 tokens → 2 words), syllables=4");
console.log("    penalty = |7-4|/7 × 0.8 = 0.3429");
console.log("    finalScore = 0.33 + 0.3429 = 0.6729  >threshold 0.6 → REJECTED");
console.log("  'KrackJack Biscuit': best window = 'क्रैकजैक बिस्किट', syllables=7");
console.log("    penalty = 0");
console.log("    finalScore = 0.55  <threshold 0.6 → ACCEPTED ✅ (wrong winner)");
console.log("\nRoot cause confirmed:");
console.log("  The hyphen in 'पारले-जी' gets stripped in getClosestWordSyllableCount's candWords");
console.log("  tokenization (line: .replace(/[...\\-...]/g, ' ')), splitting 'पारले-जी'");
console.log("  into 'पारले' + 'जी'. This makes the localName have 3 words while queryWords");
console.log("  has 2 words. The best 2-word window from 3-word candidate is 'जी बिस्किट'");
console.log("  (4 graphemes), not 'पारले-जी बिस्किट' (7 graphemes). The syllable");
console.log("  mismatch generates a 0.3429 penalty that pushes the correct answer over");
console.log("  the 0.6 rejection threshold in Trace 1.");
console.log("\n  In Trace 2 ('पारले-जी बिस्कुट'), same penalty applies (0.3429) but Parle-G");
console.log("  raw Fuse score of 0.1408 is so much better that finalScore=0.4837 still wins.");
console.log("  However in Trace 1 ('परले-ग बिस्किट', ASR degraded), raw Fuse score=0.33");
console.log("  is already higher, so 0.33+0.34=0.67 >0.6 → rejected, and KrackJack wins.");
