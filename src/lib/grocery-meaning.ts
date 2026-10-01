// Grocery synonyms describe ingredients, not interchangeable products.
// Read product meaning from its primary names; aliases may be abbreviated or noisy.
const pulseNames: [string, string][] = [
  ['blackchickpea', 'black\\s+chickpeas?|(?:kala|desi)\\s+chana|काला\\s+चना|देसी\\s+चना'],
  ['chickpea', 'chickpeas?|(?:kabuli|white|safed)\\s+chana|काबुली\\s+चन[ाे]|सफेद\\s+चन[ाे]|chh?ol[ae](?:y)?|छोल[ाे]|चोल[ाे]'],
  ['cowpea', 'cowpeas?|black[ -]eyed\\s+(?:peas?|beans?)|lob[iy]+a|लोबिया|लोबिआ|चौला'],
];
const tokenBoundary = '[\\p{L}\\p{M}\\p{N}]';
export function normalizePulseNames(text: string) {
  let normalized = text.normalize('NFKC').toLowerCase();
  for (const [identity, pattern] of pulseNames) {
    normalized = normalized.replace(new RegExp(`(?<!${tokenBoundary})(?:${pattern})(?!${tokenBoundary})`, 'gu'), identity);
  }
  return normalized;
}

export function groceryMeaning(text: string) {
  const normalized = normalizePulseNames(text);
  const pulse = pulseNames.map(([name]) => name).find(name => new RegExp(`\\b${name}\\b`).test(normalized));
  const form = /\b(?:masala|masale|spice\s+(?:mix|blend))\b|मसाल[ाे]/iu.test(text) ? 'masala'
    : /\b(?:flour|besan|atta)\b|बेसन|आटा/iu.test(text) ? 'flour'
    : /\b(?:powder)\b|पाउडर/iu.test(text) ? 'powder'
    : /\b(?:daal|dal|split)\b|दाल/iu.test(text) ? 'split-pulse'
    : /\b(?:curry|cooked|roasted|snack|namkeen|ready\s+to\s+eat)\b|करी|भुना|भुने|नमकीन/iu.test(text) ? 'prepared-pulse'
    : pulse ? 'whole-pulse' : undefined;
  return { pulse, form };
}

export function compatibleGroceryMeaning(request: ReturnType<typeof groceryMeaning>, product: ReturnType<typeof groceryMeaning>) {
  if (request.pulse && product.pulse && request.pulse !== product.pulse) return false;
  // A bare pulse name means the whole ingredient. A matching alias or pack
  // weight must never turn it into masala, flour, or another prepared product.
  if ((request.pulse || product.pulse) && request.form && product.form && request.form !== product.form) return false;
  return true;
}
