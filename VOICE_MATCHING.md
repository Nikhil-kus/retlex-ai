# Shared voice product matching

The billing page uses `src/lib/voice-product-matcher.ts` for every spoken product.
There is no Parle-G-specific selector. Chrome still supplies the transcript; this
change improves interpretation of that text, not the speech-recognition service.

## Decisions

- Normalise spacing, punctuation, Hindi/English letter names and common language
  equivalents. Bounded spelling and consonant comparisons tolerate some ASR errors.
- Compare all spoken identity words with catalogue names/local names/aliases.
  Rare catalogue words carry more weight. A category word alone cannot compensate
  for an unmatched brand. Repeated aliases do not multiply a candidate's score.
- Evaluate the entire catalogue before limiting displayed suggestions. No raw
  fuzzy-score top-15 cutoff can discard a matching product.
- Exclude bulk packs from automatic retail matches unless explicitly requested.
  Asking for 24 pieces is not itself a request for a wholesale carton.
- Use known packet weights and dimensions to resolve sizes. Missing sizes,
  competing identities, duplicates and close scores require review. Generic
  requests do not pick the product with the shortest name merely because it scores higher.
- Saved choices can resolve compatible ambiguity but cannot override failed name,
  bulk or size checks. Manual selection remains available.
- Unresolved voice items have no automatic product/price. The review UI presents
  choices and prevents adding the batch until unresolved items are chosen or removed.
- Automatic selection and manual correction share quantity conversion. A manual
  choice without a known packet weight defaults to one packet; review its quantity.

The parser is in `src/lib/voice-parser.ts`. Existing quantity parsing is retained,
with a correction to keep the spoken unit attached to the item being committed.
The debug report includes the candidate coverage, score, missing words and reasons.
Scores are ranking heuristics, not calibrated probabilities of correctness.

## Validation

Run `npm run test:voice`. The suite covers the reported transcript, unrelated
brands, unknown products, alias repetition, bulk/retail, ambiguous sizes, saved
choices, fractional quantities, the actual billing matching function, all exact
names in the saved shop catalogue, and a synthetic 5,000-product catalogue.

The catalogue file is a snapshot, not a verification of today's live database.
Synthetic timing is not a phone benchmark. Noisy-shop recordings and real Android
devices still need testing. Incomplete or incorrect catalogue names, aliases and
pack metadata can still cause uncertainty or errors. Add new observed mistakes to
the regression suite and improve shared rules rather than hardcoding product IDs.

Manual text search and OCR retain their existing matching paths. Billing storage,
payments, prices and the speech provider are not changed by this matching update.
