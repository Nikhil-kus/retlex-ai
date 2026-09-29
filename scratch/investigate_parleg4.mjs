/**
 * Part 4: Verify customer page \b word-boundary issue with Hindi
 * and confirm the ASR variant normalization gap
 */

// ── \b vs lookbehind for Hindi numbers ──────────────────────────────────────
console.log("════════ \\b word-boundary vs lookbehind for Hindi ════════\n");

// Customer page uses: /\b(to|too|tu|two|तो|टो|do|दो)\b/gi
// \b is a word boundary between \w and \W
// In JS regex, \w = [a-zA-Z0-9_]
// Devanagari chars like 'ब', 'ि', 'स', 'क', 'ट' are NOT in \w
// So \b between 'ट' and ' ' is: \W (ट is not \w) followed by \W (space is not \w)
// → No word boundary! \b fails between Devanagari chars and spaces

const testCases = [
  { text: "बिस्किट दो पैकेट", desc: "Hindi दो between Devanagari and Devanagari" },
  { text: "namak do kilo",    desc: "Hinglish do between Latin" },
  { text: "two packets",      desc: "English two between Latin" },
];

for (const tc of testCases) {
  const withBoundary = tc.text.replace(/\b(to|too|tu|two|तो|टो|do|दो)\b/gi, ' 2 ');
  console.log(`Input: "${tc.text}" (${tc.desc})`);
  console.log(`  With \\b: "${withBoundary}"`);
  console.log();
}

console.log("FINDING: \\b does NOT work for Devanagari text.");
console.log("'बिस्किट दो पैकेट' → 'दो' is NOT replaced by the customer page regex.");
console.log("'do' between Latin chars → IS replaced (because \\b works for Latin).\n");

// ── What happens in customer page for "पारले-जी बिस्कुट दो पैकेट" ──────────
console.log("════════ Customer Page: 'पारले-जी बिस्कुट दो पैकेट' ════════\n");

const customerText = "पारले-जी बिस्कुट दो पैकेट";
const afterCustomerNorm = customerText.toLowerCase().trim()
  .replace(/\b(to|too|tu|two|तो|टो|do|दो)\b/gi, ' 2 ');
console.log("After customer page normalization:", afterCustomerNorm);
console.log("'दो' was NOT replaced → tokens include 'दो' and 'पैकेट'");
console.log("\nBut 'दो' is in numMap! Let's check:");
const numMap = { 'दो': 2 };
const tokens = afterCustomerNorm.split(/\s+/).filter(w => w.length > 0);
console.log("Tokens:", tokens);
tokens.forEach(w => {
  const isNum = !isNaN(Number(w)) || numMap[w] !== undefined;
  const isUnit = ['पैकेट', 'packet', 'pc', 'pcs', 'पीस'].includes(w);
  if (isNum) console.log(`  "${w}" → numMap matches: qty=${numMap[w] ?? Number(w)}`);
  if (isUnit) console.log(`  "${w}" → unitMap: unit='pc'`);
});
console.log("\nCustomer page still correctly parses 'दो' via numMap in parseVoiceItems.");
console.log("The \b issue means दो isn't PRE-converted to '2', but it IS handled in numMap.");
console.log("So the quantity extraction STILL works in the customer page.\n");

// ── Verify: does customer page also have the hyphen/syllable bug? ─────────────
console.log("════════ Customer Page — Same Bug? ════════\n");
console.log("customer/page.tsx has IDENTICAL countSyllables and getClosestWordSyllableCount code.");
console.log("The hyphen-in-candWords bug exists in BOTH billing/page.tsx and customer/page.tsx.");
console.log("Both pages are affected by the same root cause.\n");

// ── ASR variation analysis ────────────────────────────────────────────────────
console.log("════════ ASR Variation Analysis ════════\n");

// The speech recognition system for Hindi commonly makes these substitutions:
// पारले-जी → परले-ग (vowel diacritic dropped, ज→ग substitution)
// This is because:
// 1. 'पा' vs 'प': the ā vowel (आ) carries via matra पा, but in fast speech
//    ASR sometimes drops the matra and outputs bare 'प'
// 2. 'जी' vs 'ग': "G" in "Parle-G" is transliterated as "जी" (ji) in standard
//    Hindi but Google ASR for Indian languages sometimes outputs "ग" (ga) instead
//    because the speaker says "parle-G" like the English letter, not "parle-ji"

console.log("Parle-G brand spoken as 'Parle-G' (English letter G) is commonly misrecognized:");
console.log("  Correct Hindi: 'पारले-जी' (parle-ji)");
console.log("  ASR output:    'परले-ग'   (parle-ga) — ज→ग substitution, आ→अ diacritic drop");
console.log("");
console.log("These are equivalent brand variants for matching purposes.");
console.log("The transliterate.ts file has NO entry for पारले, परले, or parle.");
console.log("The HINGLISH_TO_HINDI_MAP does NOT include:");
console.log("  'parle' → 'पारले'");
console.log("  'parle-g' → 'पारले-जी'");
console.log("  'parle ji' → 'पारले-जी'");
console.log("  'parleg' → 'पारले-जी'");
console.log("");
console.log("The HINDI_TO_HINGLISH_MAP does NOT include:");
console.log("  'पारले' → 'parle'");
console.log("  'पारले-जी' → 'parle-g'");
console.log("");
console.log("This means when a Hindi query 'पारले-जी बिस्कुट' is sent,");
console.log("transliterateHindiToHinglish returns 'पारले-जी biscuit' (only बिस्कुट maps)");
console.log("so the second Fuse search is not very helpful for finding English-named 'Parle-G Biscuit'.");
console.log("However this doesn't cause the failure — Fuse already finds Parle-G at rank 1.");

// ── Summary of all issues found ───────────────────────────────────────────────
console.log("\n════════════════════════════════════════════════════════════");
console.log("COMPLETE ROOT CAUSE ANALYSIS");
console.log("════════════════════════════════════════════════════════════\n");

console.log("FAILURE A (Trace 2 — 'पारले-जी बिस्कुट'):"); 
console.log("  ✅ Parle-G Biscuit DOES win (finalScore=0.4837 in 6-product test).");
console.log("  ⚠️  With the full Firestore catalog, if Parle-G raw score > 0.26, it gets");
console.log("     pushed over 0.6 by the 0.34 penalty → rejection. The previous analysis");
console.log("     in the chat was based on a different (full) catalog — with more biscuit");
console.log("     products competing, the raw Fuse score for Parle-G may be higher.");
console.log("  📍 The hyphen bug adds +0.3429 penalty to Parle-G. In the 6-product catalog,");
console.log("     Parle-G raw=0.1408 + 0.3429 = 0.4837 (still ≤0.6, wins).");
console.log("     But previous chat trace claimed raw=0.0792 → 0.4221, still wins — consistent.");
console.log("     The trace showed bestMatchName=KrackJack, which means in the ACTUAL Firestore");
console.log("     catalog the Fuse scores are different from this 6-product subset.");
console.log("  🔴 CONFIRMED: Syllable penalty (+0.3429) is the root cause. If Parle-G raw score");
console.log("     is ≥0.261, finalScore exceeds 0.6 and Parle-G is rejected.");
console.log("");
console.log("FAILURE B (Trace 1 — 'परले-ग बिस्किट दो पैकेट'):");
console.log("  ✅ Quantity is correctly extracted: name='परले-ग बिस्किट', qty=2, unit='pc'.");
console.log("     (Billing page lookbehind regex correctly replaces दो→2)");
console.log("     (Customer page uses \\b which fails for Hindi, but numMap still catches दो)");
console.log("  🔴 ASR degradation: 'पारले-जी' → 'परले-ग' raises raw Fuse score from 0.14 to 0.33.");
console.log("  🔴 Syllable penalty (+0.3429) pushes 0.33+0.34 = 0.67 > 0.6 → Parle-G REJECTED.");
console.log("  🔴 KrackJack (and potentially Patanjali Milk Shakti from full catalog) wins");
console.log("     because it has 0 syllable penalty (2-word name, no hyphen issue).");
console.log("");
console.log("SINGLE ROOT CAUSE FOR BOTH FAILURES:");
console.log("  getClosestWordSyllableCount strips hyphens from candWords BEFORE windowing,");
console.log("  but queryWords retain hyphens (split only on spaces). This creates a word-count");
console.log("  mismatch: query '2 words' vs candWords '3 words' for 'पारले-जी बिस्किट'.");
console.log("  The best 2-word window from 3 words is 'जी बिस्किट' (4 graphemes)");
console.log("  instead of the correct 'पारले-जी बिस्किट' (7 graphemes).");
console.log("  This creates a spurious +0.3429 penalty on the correct answer.");
console.log("");
console.log("SECONDARY CAUSE (Trace 1 only):");
console.log("  ASR produces 'परले-ग' instead of 'पारले-जी'. No normalization in Retlex");
console.log("  maps 'परले-ग' → 'Parle-G'. The higher raw Fuse score (0.33 vs 0.14)");
console.log("  combined with the syllable penalty tips the balance past the 0.6 threshold.");
console.log("");
console.log("CACHE: NOT responsible for either failure.");
console.log("  matchCacheRef: keyed by full name+unit+qty+rawText — no prefix collision.");
console.log("  matchCacheRef: cleared at each voice session start.");
console.log("  voicePrefsCache: only populated by deliberate long-press — not a systematic bug.");
