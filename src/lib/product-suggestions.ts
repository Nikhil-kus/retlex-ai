import { createVoiceProductMatcher, normalizeVoiceName, type VoiceProduct } from './voice-product-matcher';

type Product = VoiceProduct & { category?: string; price?: number };
type ReviewItem = { productId?: string | null; name?: string; spokenWord?: string; sourceRawText?: string; parsedQty?: number; parsedUnit?: string };

// Product kinds describe what is being sold, not its shelf/category or brand.
// Compound forms take precedence over ingredients: almond oil is not an almond.
const kinds: [string, RegExp][] = [
  ['hair oil', /hair oil|हेयर ऑयल|बालों.*तेल/iu],
  ['dishwash', /dishwash|dish wash|बर्तन/iu],
  ['detergent', /detergent|washing powder|laundry|डिटर्जेंट/iu],
  ['shampoo', /shampoo|शैम्पू|शैंपू/iu],
  ['toothpaste', /toothpaste|टूथपेस्ट/iu],
  ['soap', /\bsoap\b|साबुन/iu],
  ['biscuit', /biscuits?|बिस्किट|बिस्कुट/iu],
  ['chocolate', /chocolate|चॉकलेट/iu],
  ['drink', /\bdrink\b|\bjuice\b|flavou?red milk|ड्रिंक|जूस/iu],
  ['mix', /instant mix|इंस्टेंट मिक्स/iu],
  ['oil', /\boil\b|तेल/iu],
  ['powder', /\bpowder\b|पाउडर/iu],
  ['nuts', /\balmonds?\b|\bbadam\b|\bcashew\b|\braisins?\b|बादाम|काजू|किशमिश/iu],
  ['rice', /\brice\b|चावल/iu],
  ['flour', /\bflour\b|\batta\b|आटा/iu],
  ['salt', /\bsalt\b|नमक/iu],
  ['tea', /\btea\b|चाय/iu],
  ['coffee', /\bcoffee\b|कॉफी/iu],
];
const ingredients: [string, RegExp][] = [
  ['almond', /\balmonds?\b|\bbadam\b|बादाम/iu],
  ['cashew', /\bcashews?\b|\bkaju\b|काजू/iu],
  ['raisin', /\braisins?\b|किशमिश/iu],
  ['coriander', /\bcoriander\b|\bdhaniya\b|धनिया/iu],
  ['turmeric', /\bturmeric\b|\bhaldi\b|हल्दी/iu],
  ['chilli', /\bchill?i\b|मिर्च|मिर्ची/iu],
  ['cumin', /\bcumin\b|\bjeera\b|जीरा/iu],
  ['coconut', /\bcoconut\b|नारियल/iu],
  ['mustard', /\bmustard\b|सरसों/iu],
  ['sunflower', /\bsunflower\b|सूरजमुखी/iu],
];
function profile(text: string) {
  return { kind: kinds.find(([, pattern]) => pattern.test(text))?.[0],
    ingredients: ingredients.filter(([, pattern]) => pattern.test(text)).map(([name]) => name).join('|') };
}
function form(p: Product) {
  const text = `${p.name} ${p.localName || ''}`;
  if (/\bbulk\b|\bcarton\b|\b\d+\s*(?:pcs|pieces|packs)\b|बल्क|कार्टन/i.test(text)) return 'bulk';
  if (/\b(?:loose|khula|khulla)\b|खुला|खुली/i.test(text)
    || (['kg', 'g', 'ml', 'l', 'ltr'].includes(p.baseUnit || '') && (p.baseQuantity || 1) === 1)) return 'loose';
  return 'retail';
}
function family(p: Product) {
  // Remove only pack measures/prices. Keep variant words, numeric brand names,
  // container types, and qualifiers; prefix matching merges distinct products.
  return normalizeVoiceName(p.name
    .replace(/₹\s*\d+(?:\.\d+)?/g, '')
    .replace(/\d+(?:\.\d+)?\s*(?:kg|grams?|gm|g|ml|ltr|litres?|l)(?=$|[^a-z])/gi, '')
    .replace(/\b(?:packet|pkt|pack)\b/gi, '')).replace(/\s+/g, ' ').trim();
}
const priceOrder = (a: Product, b: Product) => (a.price && a.price > 0 ? a.price : Infinity) - (b.price && b.price > 0 ? b.price : Infinity) || a.id.localeCompare(b.id);

export function createProductSuggestions<T extends Product>(catalog: T[]) {
  const matcher = createVoiceProductMatcher(catalog);
  const entries = catalog.map(product => ({ product, family: family(product), form: form(product),
    profile: profile(`${product.name} ${product.localName || ''}`) }));
  const byId = new Map(entries.map(entry => [entry.product.id, entry]));
  function sizes(product: T): T[] {
    const seed = byId.get(product.id);
    if (!seed) return [];
    return entries.filter(e => e.product.id !== product.id && e.family === seed.family && e.form === seed.form)
      .map(e => e.product).sort(priceOrder).slice(0, 8);
  }
  return {
    sizes,
    suggest(item: ReviewItem): { brandVariants: T[]; sizeVariants: T[] } {
      const seed = item.productId ? byId.get(item.productId) : undefined;
      if (!seed) {
        // Re-evaluate the actual utterance, never expand from an arbitrary seed
        // or trust stale/partial debug candidates as display recommendations.
        const name = item.spokenWord || item.name || '';
        const intent = profile(name);
        const result = matcher.match({ name, rawText: item.sourceRawText, quantity: item.parsedQty, unit: item.parsedUnit });
        const choices = result.candidates.filter(c => !c.missingTokens.length && c.coverage >= 0.85
          && (c.eligible || /pack size|Pack weight/.test(c.reason)))
          .filter(c => {
            const candidate = byId.get(c.product.id)!.profile;
            return (!intent.kind || candidate.kind === intent.kind)
              && (!intent.ingredients || candidate.ingredients === intent.ingredients);
          }).map(c => c.product);
        return { brandVariants: choices, sizeVariants: [] };
      }
      const sizeVariants = sizes(seed.product);
      // Unknown kinds get exact-family sizes only. A broad category, shared
      // brand, or ingredient alone is never evidence of substitutability.
      const alternatives = entries.filter(e => e.product.id !== seed.product.id && e.family !== seed.family
        && e.form === seed.form && Boolean(seed.profile.kind) && e.profile.kind === seed.profile.kind
        && e.profile.ingredients === seed.profile.ingredients
        && (['biscuit', 'chocolate', 'salt', 'tea', 'coffee'].includes(seed.profile.kind!)
          || Boolean(seed.profile.ingredients)));
      const families = new Map<string, T>();
      for (const e of alternatives.sort((a, b) => priceOrder(a.product, b.product))) {
        if (!families.has(e.family)) families.set(e.family, e.product);
      }
      return { sizeVariants, brandVariants: [...families.values()].slice(0, 12) };
    },
  };
}
