import { transliterateHindiToHinglish } from './transliterate';

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
}
export interface VoiceMatch<T> {
  product: T | null;
  confidence: 'high' | 'low';
  reason: string;
  candidates: VoiceCandidate<T>[];
}

// Language rules, not product exceptions. Product identities come from the shop catalogue.
const words: Record<string, string> = {
  'बिस्किट': 'biscuit', biscuits: 'biscuit', 'जी': 'g', 'जि': 'g', 'ग': 'g', ji: 'g', jee: 'g',
  'बी': 'b', 'सी': 'c', 'डी': 'd', 'टी': 't', 'पी': 'p', 'ए': 'a',
};
const consonants: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n', 'च': 'ch', 'छ': 'ch',
  'ज': 'j', 'झ': 'jh', 'ञ': 'n', 'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n', 'प': 'p', 'फ': 'f', 'ब': 'b',
  'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
};
const bulkRequestPattern = /\b(?:bulk|carton|wholesale)\b|बल्क|कार्टन|थोक/i;
function hasBundleSize(text: string) {
  const count = text.match(/\b(\d+)\s*(?:pcs?|pieces?|packs?)\b/i);
  return Number(count?.[1]) > 1;
}
const measurePattern = /(\d+(?:\.\d+)?)\s*(kg|kilograms?|g|gm|grams?|ml|l|ltr|litres?|liters?|किलो|ग्राम|लीटर)(?=$|[^\p{L}\p{M}])/iu;

export function normalizeVoiceName(text: string): string {
  const cleaned = text.normalize('NFKC').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
    .replace(/[०-९]/g, digit => String(digit.charCodeAt(0) - 0x966))
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();
  return cleaned.split(/\s+/).filter(Boolean).map(token =>
    words[token] || transliterateHindiToHinglish(token)).join(' ');
}

function phonetic(token: string) {
  return [...token].map(char => consonants[char] ?? char).join('')
    .replace(/[\u0900-\u097f]/g, '').replace(/[aeiou]/g, '')
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
  if (Math.abs(a.length - b.length) > 2) return 0;
  const edits = distance(a, b), longest = Math.max(a.length, b.length);
  return edits <= (longest >= 7 ? 2 : 1) ? 1 - edits / longest : 0;
}

function identity(text: string) {
  return normalizeVoiceName(text
    .replace(/\([^)]*(?:bulk|बल्क)[^)]*\)/gi, ' ')
    .replace(/\d+(?:\.\d+)?\s*(?:kg|gm|grams?|g|ml|ltr|litres?|liters?|l|किलो|ग्राम|लीटर)(?=$|[^\p{L}\p{M}])/giu, ' ')
    .replace(/\b\d+\s*(?:pcs?|pieces?|packs?)\b/gi, ' ')
    .replace(/\b(?:loose|khula|khulla|packet|pkt|pack)\b|खुला|खुली/gi, ' ')
    .replace(/\bbulk\b|\bcarton\b|बल्क|कार्टन/gi, ' '));
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

export function voiceQuantityForProduct(quantity: number, unit: string, product: VoiceProduct) {
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
    fields: [
      { field: 'name', text: product.name }, { field: 'localName', text: product.localName || '' },
      ...(product.localAliases || []).map(text => ({ field: 'alias', text })),
    ].filter(f => f.text).map(f => ({ ...f, tokens: identity(f.text).split(' ').filter(Boolean) })),
  }));
  const vocabulary = [...new Set(entries.flatMap(e => e.fields.flatMap(f => f.tokens)))];
  const documentFrequency = new Map<string, number>();
  for (const entry of entries) for (const token of new Set(entry.fields.flatMap(f => f.tokens))) {
    documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
  }

  return {
    match(request: MatchRequest, preferredProductId?: string): VoiceMatch<T> {
      const tokens = identity(request.name).split(' ').filter(Boolean);
      if (!tokens.length) return { product: null, confidence: 'low', reason: 'Say a product name', candidates: [] };
      const lookup = tokens.map(token => new Map(vocabulary.map(word => [word, similarity(token, word)])));
      // Rare words (usually brand/variant) carry more weight than category words.
      const weights = tokens.map((_, i) => {
        const frequency = Math.max(1, ...vocabulary.filter(w => (lookup[i].get(w) || 0) >= 0.85).map(w => documentFrequency.get(w) || 1));
        return 1 + Math.log(1 + products.length / frequency);
      });
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      const bulkRequested = bulkRequestPattern.test(`${request.name} ${request.rawText || ''}`) || hasBundleSize(request.name);
      const looseRequested = /\b(?:loose|khula|khulla)\b|खुला|खुली/i.test(request.rawText || request.name);
      const packetRequested = /\b(?:packet|pkt|pack|piece|pcs|pc)\b|पैकेट|पीस/i.test(request.rawText || '');
      const namedSize = request.name.match(measurePattern);
      const requested = namedSize ? measure(Number(namedSize[1]), namedSize[2])
        : /^(kg|g|ml|l|ltr)$/.test(request.unit || '') ? measure(request.quantity || 1, request.unit!) : null;

      const ranked: VoiceCandidate<T>[] = entries.map(entry => {
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
        const loose = /\b(?:loose|khula|khulla)\b|खुला|खुली/i.test(`${entry.product.name} ${entry.product.localName || ''}`)
          || (['g', 'kg', 'ml', 'l', 'ltr'].includes(entry.product.baseUnit || '') && (entry.product.baseQuantity || 1) === 1);
        if (looseRequested && !loose) reason = 'Loose product was requested';
        if (packetRequested && loose) reason = 'A packet was requested';
        if (requested && entry.measure && requested.dimension !== entry.measure.dimension) reason = 'Weight and volume units do not match';
        if (requested && entry.measure && !loose) {
          if (requested.dimension !== entry.measure.dimension || requested.amount !== entry.measure.amount) reason = 'Confirm the requested pack size';
        }
        if (requested && !entry.measure && !loose) reason = 'Pack weight is missing; choose a product and check its quantity';
        if (request.requestedPrice !== undefined && (
          !Number.isFinite(request.requestedPrice) || request.requestedPrice <= 0 ||
          !Number.isFinite(entry.product.price) ||
          Math.round(entry.product.price! * 100) !== Math.round(request.requestedPrice * 100)
        )) reason = 'Product price does not match the spoken price';
        return { product: entry.product, ...best, identityComplete, eligible: !reason && best.coverage >= 0.85 && best.score >= 0.72,
          reason: reason || (best.coverage < 0.85 || best.score < 0.72 ? 'Name match is uncertain' : 'All spoken identity words match') };
      }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || a.product.id.localeCompare(b.product.id));

      const eligible = ranked.filter(c => c.eligible);
      const top = eligible[0], next = eligible[1];
      const preferred = eligible.find(c => c.product.id === preferredProductId && top.score - c.score <= 0.15);
      const clear = top && (!next || (top.identityComplete && top.score - next.score >= 0.06));
      return {
        product: preferred?.product || (clear ? top.product : null),
        confidence: preferred || clear ? 'high' : 'low',
        reason: preferred ? 'Compatible saved choice' : clear ? 'Clear product identity match' : top ? 'Choose the brand or pack size' : 'No reliable match; choose a product or repeat its name',
        // Limit display only AFTER checking the entire catalogue and ambiguity.
        candidates: ranked.filter(c => c.coverage >= 0.45).slice(0, 8),
      };
    },
  };
}
