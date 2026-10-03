import { transliterateHindiToHinglish } from './transliterate';
import { compatibleGroceryMeaning, groceryMeaning, normalizePulseNames } from './grocery-meaning';
import { productSaleForm, requestedSaleForm, stripSaleWords } from './product-packaging';
import { relativePackSize, stripRelativePackSize } from './relative-pack-size';
import { createHindiCatalogRecovery } from './hindi-catalog-recovery';

export interface VoiceProduct {
  id: string;
  name: string;
  localName?: string | null;
  localAliases?: string[] | null;
  baseUnit?: string;
  baseQuantity?: number;
  packetWeight?: number | null;
  packetUnit?: string | null;
  price?: number;
}
export interface MatchRequest {
  name: string;
  quantity?: number;
  unit?: string;
  rawText?: string;
  requestedPrice?: number;
  saleForm?: 'loose' | 'packet';
  packSize?: { quantity: number; unit: string };
  packetCount?: number;
}
export interface VoiceCandidate<T> {
  product: T;
  score: number;
  coverage: number;
  matchedField: string;
  identityComplete: boolean;
  missingTokens: string[];
  eligible: boolean;
  reason: string;
  sizeDistance?: number;
  packSizeAmount?: number;
  quantityRank?: number;
  fulfillmentCount?: number;
}
export interface VoiceMatch<T> {
  product: T | null;
  confidence: 'high' | 'low';
  reason: string;
  candidates: VoiceCandidate<T>[];
  isApproximateSize?: boolean;
  packetCount?: number;
  selectedPackLabel?: string;
}

// Language rules, not product exceptions. Product identities come from the shop catalogue.
const words: Record<string, string> = {
  'बिस्किट': 'biscuit', biscuits: 'biscuit', 'जी': 'g', 'जि': 'g', 'ग': 'g', ji: 'g', jee: 'g',
  'बी': 'b', 'सी': 'c', 'डी': 'd', 'टी': 't', 'पी': 'p', 'ए': 'a',
};
const bulkRequestPattern = /\b(?:bulk|carton|wholesale)\b|बल्क|कार्टन|थोक/i;
function hasBundleSize(text: string) {
  const count = text.match(/\b(\d+)\s*(?:pcs?|pieces?|packs?)\b/i);
  return Number(count?.[1]) > 1;
}
const measurePattern = /(\d+(?:\.\d+)?)\s*(kg|kilograms?|g|gm|grams?|ml|l|ltr|litres?|liters?|किलो|ग्राम|लीटर)(?=$|[^\p{L}\p{M}])/iu;

export function normalizeVoiceName(text: string): string {
  const cleaned = normalizePulseNames(text.replace(/([a-z])([A-Z])/g, '$1 $2'))
    .replace(/[०-९]/g, digit => String(digit.charCodeAt(0) - 0x966))
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();
  return cleaned.split(/\s+/).filter(Boolean).map(token =>
    words[token] || transliterateHindiToHinglish(token)).join(' ');
}

function phonetic(token: string) {
  // Unmapped Hindi words still contain vowels, matras and nasal marks. Dropping
  // those characters can collapse unrelated identities (अंजीर -> jr -> jeera).
  // Only use the Latin sound heuristic after complete transliteration.
  if (!/^[a-z]+$/.test(token)) return '';
  return token.replace(/[aeiou]/g, '')
    .replace(/ph/g, 'f').replace(/w/g, 'v').replace(/(.)\1+/g, '$1');
}

function distance(a: string, b: string) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(next[j - 1] + 1, row[j] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}

function similarity(a: string, b: string) {
  if (a === b) return 1;
  // Numbers and letter suffixes identify a variant; do not fuzzy-match them.
  if (/\d/.test(a + b) || a.length < 3 || b.length < 3) return 0;
  const ap = phonetic(a), bp = phonetic(b);
  if (ap.length >= 2 && ap === bp) return 0.9;
  if (/\p{Script=Devanagari}/u.test(a) !== /\p{Script=Devanagari}/u.test(b)) return 0;
  if (Math.abs(a.length - b.length) > 2) return 0;
  const edits = distance(a, b), longest = Math.max(a.length, b.length);
  return edits <= (longest >= 7 ? 2 : 1) ? 1 - edits / longest : 0;
}

function identity(text: string) {
  return normalizeVoiceName(stripSaleWords(text
    .replace(/\([^)]*(?:bulk|बल्क)[^)]*\)/gi, ' ')
    .replace(/\d+(?:\.\d+)?\s*(?:kg|gm|grams?|g|ml|ltr|litres?|liters?|l|किलो|ग्राम|लीटर)(?=$|[^\p{L}\p{M}])/giu, ' ')
    .replace(/\b\d+\s*(?:pcs?|pieces?|packs?)\b/gi, ' ')
    .replace(/\bbulk\b|\bcarton\b|बल्क|कार्टन/gi, ' ')));
}

function measure(amount: number, unit: string) {
  const u = unit.toLowerCase();
  return { amount: amount * (/^(kg|kilogram|kilograms|l|ltr|litre|litres|liter|liters|किलो|लीटर)$/.test(u) ? 1000 : 1),
    dimension: /^(ml|l|ltr|litre|litres|liter|liters|लीटर)$/.test(u) ? 'volume' : 'weight' };
}

function productMeasure(product: VoiceProduct) {
  if (product.packetWeight && product.packetWeight > 0 && product.packetUnit) return measure(product.packetWeight, product.packetUnit);
  const named = product.name.match(measurePattern);
  if (named && Number(named[1]) > 0) return measure(Number(named[1]), named[2]);
  if (product.baseQuantity && product.baseQuantity > 0 && /^(g|kg|ml|l|ltr)$/.test(product.baseUnit || '')) return measure(product.baseQuantity, product.baseUnit!);
  return null; // Do not assume an unspecified baseQuantity is grams.
}

function measureLabel(size: { amount: number; dimension: string }) {
  return `${size.amount >= 1000 ? size.amount / 1000 : size.amount} ${size.dimension === 'weight'
    ? (size.amount >= 1000 ? 'kg' : 'g') : (size.amount >= 1000 ? 'l' : 'ml')}`;
}

// Total weight/volume is distinct from an explicitly requested individual pack.
export function totalQuantityPlan(quantity: number, unit: string, product: VoiceProduct) {
  if (!/^(kg|g|ml|l|ltr)$/.test(unit) || !Number.isFinite(quantity) || quantity <= 0) return undefined;
  const requested = measure(quantity, unit);
  const size = productMeasure(product);
  if (productSaleForm(product) === 'loose') {
    const base = /^(kg|g|ml|l|ltr)$/.test(product.baseUnit || '') ? measure(1, product.baseUnit!) : size;
    const exact = Boolean(base && base.dimension === requested.dimension);
    return { rank: exact ? 1 : 5, exact, count: undefined, size: undefined,
      label: exact ? `${measureLabel(requested)} loose` : 'Check quantity' };
  }
  if (!size || size.dimension !== requested.dimension) return { rank: 5, exact: false, count: undefined, size: undefined, label: 'Check pack size' };
  const ratio = requested.amount / size.amount;
  const exact = ratio >= 1 && Math.abs(ratio - Math.round(ratio)) < 1e-8;
  const count = exact ? Math.round(ratio) : undefined;
  const rank = exact ? (count === 1 ? 0 : 2) : size.amount < requested.amount ? 3 : 4;
  return { rank, exact, count, size: measureLabel(size),
    label: exact ? `${count} × ${measureLabel(size)} = ${measureLabel(requested)}` : `${measureLabel(size)} pack — choose quantity` };
}

export function voiceQuantityForProduct(quantity: number, unit: string, product: VoiceProduct, packetCount?: number) {
  const count = packetCount ?? (/^(pc|pkt|packet|pack|pcs)$/.test(unit) ? quantity : undefined);
  if (count !== undefined && productSaleForm(product) === 'packet') {
    const baseUnit = product.baseUnit || 'pc';
    if (['pc', 'pkt'].includes(baseUnit)) return { quantity: count, unit: baseUnit };
    const size = productMeasure(product);
    if (size && /^(kg|g|ml|l|ltr)$/.test(baseUnit)) {
      const base = measure(1, baseUnit);
      if (base.dimension === size.dimension) return { quantity: count * size.amount / base.amount, unit: baseUnit };
    }
  }
  if (!/^(kg|g|ml|l|ltr)$/.test(unit)) return { quantity, unit: product.baseUnit || 'pc' };
  const requested = measure(quantity, unit);
  const baseUnit = product.baseUnit || 'pc';
  if (['pc', 'pkt'].includes(baseUnit)) {
    const size = productMeasure(product);
    if (size && size.dimension === requested.dimension) return { quantity: requested.amount / size.amount, unit: baseUnit };
    // No safe weight-to-packet conversion exists without a known pack size.
    return { quantity: 1, unit: baseUnit };
  }
  if (/^(kg|g|ml|l|ltr)$/.test(baseUnit)) {
    const base = measure(1, baseUnit);
    return { quantity: requested.amount / base.amount, unit: baseUnit };
  }
  return { quantity, unit };
}

export function createVoiceProductMatcher<T extends VoiceProduct>(products: T[]) {
  const entries = products.map(product => ({
    product,
    bulk: bulkRequestPattern.test(`${product.name} ${product.localName || ''}`) || hasBundleSize(product.name),
    measure: productMeasure(product),
    meaning: groceryMeaning(`${product.name} ${product.localName || ''}`),
    saleForm: productSaleForm(product),
    fields: [
      { field: 'name', text: product.name }, { field: 'localName', text: product.localName || '' },
      ...(product.localAliases || []).map(text => ({ field: 'alias', text })),
    ].filter(f => f.text).map(f => ({ ...f, tokens: identity(f.text).split(' ').filter(Boolean) })),
  }));
  const vocabulary = [...new Set(entries.flatMap(e => e.fields.flatMap(f => f.tokens)))];
  const knownTokens = new Set(vocabulary);
  const recoverHindi = createHindiCatalogRecovery(entries.flatMap(e => e.fields.map(f => f.text)), identity);
  const documentFrequency = new Map<string, number>();
  for (const entry of entries) for (const token of new Set(entry.fields.flatMap(f => f.tokens))) {
    documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
  }

  return {
    match(request: MatchRequest, preferredProductId?: string, allowHindiRecovery = true): VoiceMatch<T> {
      const literalIdentity = identity(request.name);
      const exactNamedSize = relativePackSize(request.name) && entries.some(entry => entry.fields.some(field =>
        field.field !== 'alias' && field.tokens.join(' ') === literalIdentity));
      const relativeSize = exactNamedSize ? undefined : relativePackSize(`${request.name} ${request.rawText || ''}`);
      const originalName = relativeSize ? stripRelativePackSize(request.name) : request.name;
      const originalIdentity = identity(originalName);
      const exactIdentity = entries.some(entry => entry.fields.some(field => field.tokens.join(' ') === originalIdentity));
      const recovery = !allowHindiRecovery || exactIdentity ? { alternatives: [], changed: false } : recoverHindi(originalName);
      if (recovery.changed) {
        // Every interpretation still passes the normal identity, brand, price,
        // size and packaging checks. Never auto-select a phonetic recovery.
        const choices = new Map<string, VoiceCandidate<T>>();
        for (const name of recovery.alternatives) {
          const result = this.match({ ...request, name }, undefined, false);
          for (const candidate of result.candidates) {
            if (candidate.missingTokens.length || candidate.coverage < 0.85
              || (!candidate.eligible && !/pack size|Pack weight/.test(candidate.reason))) continue;
            const previous = choices.get(candidate.product.id);
            if (!previous || candidate.score > previous.score) choices.set(candidate.product.id, candidate);
          }
        }
        const candidates = [...choices.values()].sort((a, b) => Number(b.eligible) - Number(a.eligible)
          || b.score - a.score || a.product.id.localeCompare(b.product.id)).slice(0, 8);
        return { product: null, confidence: 'low', candidates,
          reason: candidates.length ? 'Similar-sounding products found; choose the intended product'
            : 'No reliable match; choose a product or repeat its name' };
      }
      const requestName = originalName;
      const requestedMeaning = groceryMeaning(requestName);
      const tokens = identity(requestName).split(' ').filter(Boolean);
      if (!tokens.length) return { product: null, confidence: 'low', reason: 'Say a product name', candidates: [] };
      // An exact catalogue word is an identity anchor, not a typo. Keep fuzzy
      // recovery for unknown spellings without appending sound-alike products
      // to a valid name. Resolve this before price/size/preference selection.
      const lookup = tokens.map(token => new Map(vocabulary.map(word =>
        [word, knownTokens.has(token) ? Number(token === word) : similarity(token, word)])));
      // Rare words (usually brand/variant) carry more weight than category words.
      const weights = tokens.map((_, i) => {
        const frequency = Math.max(1, ...vocabulary.filter(w => (lookup[i].get(w) || 0) >= 0.85).map(w => documentFrequency.get(w) || 1));
        return 1 + Math.log(1 + products.length / frequency);
      });
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      const bulkRequested = bulkRequestPattern.test(`${request.name} ${request.rawText || ''}`) || hasBundleSize(request.name);
      const saleForm = request.saleForm || (request.packSize || relativeSize ? 'packet' : requestedSaleForm(`${request.name} ${request.rawText || ''}`));
      const namedSize = request.name.match(measurePattern);
      const requested = request.packSize ? measure(request.packSize.quantity, request.packSize.unit)
        : namedSize ? measure(Number(namedSize[1]), namedSize[2])
        : /^(kg|g|ml|l|ltr)$/.test(request.unit || '') ? measure(request.quantity || 1, request.unit!) : null;
      const totalRequested = Boolean(requested && !namedSize && !request.packSize && saleForm !== 'packet');

      const ranked: VoiceCandidate<T>[] = entries
        .filter(entry => compatibleGroceryMeaning(requestedMeaning, entry.meaning))
        .filter(entry => !saleForm || entry.saleForm === saleForm)
        .map(entry => {
        let best = { score: 0, coverage: 0, matchedField: '', missingTokens: tokens };
        let identityComplete = false;
        for (const field of entry.fields) {
          const used = new Set<number>();
          const qualities = tokens.map((token, i) => {
            let quality = 0, chosen = -1;
            field.tokens.forEach((word, j) => {
              const value = used.has(j) ? 0 : lookup[i].get(word) || 0;
              if (value > quality) { quality = value; chosen = j; }
            });
            if (quality >= 0.7) used.add(chosen);
            return quality >= 0.7 ? quality : 0;
          });
          // Joining handles names written as one word versus separated words,
          // including letter suffixes, without a product-specific dictionary.
          const joinedExact = tokens.join('') === field.tokens.join('');
          const missingTokens = joinedExact ? [] : tokens.filter((_, i) => !qualities[i]);
          const coverage = joinedExact ? 1 : qualities.reduce((sum, q, i) => sum + q * weights[i], 0) / totalWeight;
          const extras = joinedExact ? 0 : Math.max(0, field.tokens.length - used.size);
          if (field.field !== 'alias' && !missingTokens.length && extras === 0) identityComplete = true;
          const score = coverage - Math.min(0.28, extras * 0.075) - (field.field === 'alias' ? 0.025 : 0);
          // A partial alias must not hide a complete match in a primary name.
          if ((!missingTokens.length && best.missingTokens.length > 0)
            || (Boolean(missingTokens.length) === Boolean(best.missingTokens.length) && score > best.score)) {
            best = { score, coverage, matchedField: field.field, missingTokens };
          }
        }
        let reason = best.missingTokens.length ? 'Product identity does not match every spoken word' : '';
        if (entry.bulk !== bulkRequested) reason = entry.bulk ? 'Bulk pack was not requested' : 'A bulk pack was requested';
        const loose = entry.saleForm === 'loose';
        const plan = totalRequested && requested ? totalQuantityPlan(requested.amount,
          requested.dimension === 'weight' ? 'g' : 'ml', entry.product) : undefined;
        if (requested && entry.measure && requested.dimension !== entry.measure.dimension) reason = 'Weight and volume units do not match';
        if (requested && entry.measure && !loose) {
          if (!reason && (requested.dimension !== entry.measure.dimension || (totalRequested ? !plan?.exact
            : saleForm !== 'packet' && requested.amount !== entry.measure.amount))) reason = 'Confirm the requested pack size';
        }
        if (!reason && totalRequested && !plan?.exact) reason = 'Confirm the requested pack size';
        if (requested && !entry.measure && !loose) reason = 'Pack weight is missing; choose a product and check its quantity';
        if (request.requestedPrice !== undefined && (
          !Number.isFinite(request.requestedPrice) || request.requestedPrice <= 0 ||
          !Number.isFinite(entry.product.price) ||
          Math.round(entry.product.price! * 100) !== Math.round(request.requestedPrice * 100)
        )) reason = 'Product price does not match the spoken price';
        const sizeDistance = saleForm === 'packet' && requested && entry.measure && requested.dimension === entry.measure.dimension
          ? Math.abs(requested.amount - entry.measure.amount) : undefined;
        return { product: entry.product, ...best, identityComplete, sizeDistance, quantityRank: plan?.rank, fulfillmentCount: plan?.count, packSizeAmount: entry.measure?.amount, eligible: !reason && best.coverage >= 0.85 && best.score >= 0.72,
          reason: reason || (best.coverage < 0.85 || best.score < 0.72 ? 'Name match is uncertain' : 'All spoken identity words match') };
      }).sort((a, b) => Number(b.eligible) - Number(a.eligible)
        || (a.quantityRank ?? 0) - (b.quantityRank ?? 0)
        || (totalRequested && a.quantityRank === 2 ? (a.fulfillmentCount ?? Infinity) - (b.fulfillmentCount ?? Infinity) : 0)
        || (totalRequested && a.quantityRank === 3 ? (b.packSizeAmount ?? 0) - (a.packSizeAmount ?? 0) : 0)
        || (totalRequested && a.quantityRank === 4 ? (a.packSizeAmount ?? Infinity) - (b.packSizeAmount ?? Infinity) : 0)
        || (a.sizeDistance ?? Infinity) - (b.sizeDistance ?? Infinity)
        || b.score - a.score
        || (saleForm === 'packet' && requested ? (a.packSizeAmount ?? Infinity) - (b.packSizeAmount ?? Infinity) : 0)
        || a.product.id.localeCompare(b.product.id));

      // Rank relative sizes only within the best matching identity, after all
      // explicit price/quantity constraints. Never let a saved choice override it.
      const relativeActive = Boolean(relativeSize && !requested && saleForm === 'packet');
      if (relativeActive) {
        const eligibleSizes = ranked.filter(c => c.eligible && Math.abs(c.score - ranked[0].score) < 1e-8);
        const measures = eligibleSizes.map(c => productMeasure(c.product));
        const useMeasure = measures.length > 0 && measures.every(m => m && m.dimension === measures[0]?.dimension);
        const value = (c: VoiceCandidate<T>) => useMeasure ? productMeasure(c.product)?.amount
          : c.product.price && Number.isFinite(c.product.price) && c.product.price > 0 ? c.product.price : undefined;
        const values = [...new Set(eligibleSizes.map(value).filter((v): v is number => v !== undefined))].sort((a, b) => a - b);
        const middle = values[Math.floor((values.length - 1) / 2)];
        const order = (c: VoiceCandidate<T>) => {
          const v = value(c);
          return v === undefined ? Infinity : relativeSize === 'large' ? -v : relativeSize === 'medium' ? Math.abs(values.indexOf(v) - values.indexOf(middle)) : v;
        };
        ranked.sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score
          || order(a) - order(b) || (value(a) ?? Infinity) - (value(b) ?? Infinity) || a.product.id.localeCompare(b.product.id));
      }
      const eligible = ranked.filter(c => c.eligible);
      const top = eligible[0], next = eligible[1];
      const preferred = relativeActive ? undefined : eligible.find(c => c.product.id === preferredProductId && top.score - c.score <= 0.15
        && c.quantityRank === top.quantityRank && c.fulfillmentCount === top.fulfillmentCount
        && c.sizeDistance === top.sizeDistance);
      // For price requests, select the best eligible name match automatically.
      // Eligibility still enforces name, price, pack intent and any spoken size.
      // Sorting by ID keeps equal-score choices stable across catalogue order.
      const priceSelected = request.requestedPrice !== undefined && top;
      const packetSelected = saleForm === 'packet' && !bulkRequested && top;
      const betterQuantity = totalRequested && top && next && (top.quantityRank !== next.quantityRank
        || top.fulfillmentCount !== next.fulfillmentCount);
      const totalPacketsSelected = totalRequested && top?.fulfillmentCount;
      const clear = top && (totalPacketsSelected || betterQuantity || priceSelected || packetSelected || !next || (top.identityComplete && top.score - next.score >= 0.06));
      const selected = preferred || (clear ? top : undefined);
      const isApproximateSize = Boolean(selected?.sizeDistance && selected.sizeDistance > 0);
      const selectedSize = selected ? productMeasure(selected.product) : null;
      const selectedPackLabel = selectedSize && (saleForm === 'packet' || selected?.fulfillmentCount)
        ? `${selectedSize.amount >= 1000 ? selectedSize.amount / 1000 : selectedSize.amount} ${selectedSize.dimension === 'weight'
          ? (selectedSize.amount >= 1000 ? 'kg' : 'g') : (selectedSize.amount >= 1000 ? 'l' : 'ml')}` : undefined;
      return {
        product: preferred?.product || (clear ? top.product : null),
        confidence: preferred || clear ? 'high' : 'low',
        reason: totalRequested && selected ? 'Requested total quantity matched' : isApproximateSize ? 'Closest available pack size selected' : preferred ? 'Compatible saved choice' : priceSelected ? 'Best name match at the requested price' : clear ? 'Clear product identity match' : top ? 'Choose the brand or pack size' : ranked.some(c => !c.missingTokens.length && c.coverage >= 0.85 && /pack size|Pack weight/.test(c.reason)) ? 'Product recognized; choose a pack size and quantity' : 'No reliable match; choose a product or repeat its name',
        isApproximateSize,
        packetCount: totalRequested ? selected?.fulfillmentCount : saleForm === 'packet' ? (request.packetCount ?? (requested ? 1 : request.quantity ?? 1)) : undefined,
        selectedPackLabel,
        // Limit display only AFTER checking the entire catalogue and ambiguity.
        candidates: ranked.filter(c => c.coverage >= 0.45).slice(0, 8),
      };
    },
  };
}
