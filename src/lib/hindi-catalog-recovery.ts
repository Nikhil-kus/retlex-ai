import { HINDI_TO_HINGLISH_MAP, HINGLISH_TO_HINDI_MAP } from './transliterate';

// Preserve character order and length, allowing only one listed sound change
// per word (including short/long i and u). Never erase vowels or nasal marks.
// These are suggestion rules, never global spelling equivalences.
const groups = ['कख', 'गघ', 'चछ', 'जझ', 'टठ', 'डढ', 'तथ', 'दध', 'पफ', 'बभ', 'नण', 'शषस', 'िी', 'ुू'];
const consonantGroup = new Map(groups.flatMap((group, i) => [...group].map(c => [c, i] as const)));
const hindiWord = /^[\p{Script=Devanagari}\p{M}]+$/u;
const tokenize = (text: string) => text.normalize('NFC').match(/[\p{L}\p{M}\p{N}]+/gu) || [];

function closeSound(a: string, b: string) {
  if (a.length !== b.length) return false;
  let changes = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    const baVa = (a[i] === 'ब' && b[i] === 'व') || (a[i] === 'व' && b[i] === 'ब');
    if (!baVa && (consonantGroup.get(a[i]) === undefined || consonantGroup.get(a[i]) !== consonantGroup.get(b[i]))) return false;
    if (++changes > 1) return false;
  }
  return changes === 1;
}

export function createHindiCatalogRecovery(texts: string[], normalize: (text: string) => string) {
  const known = new Set(texts.flatMap(text => normalize(text).split(' ')));
  const spellings = new Set(texts.flatMap(tokenize).filter(word => hindiWord.test(word)));
  // Dictionary bridges are usable only when their identity exists in this shop.
  for (const [hindi, latin] of Object.entries(HINDI_TO_HINGLISH_MAP)) {
    if (!hindi.includes(' ') && known.has(normalize(latin))) spellings.add(hindi.normalize('NFC'));
  }
  for (const [latin, hindi] of Object.entries(HINGLISH_TO_HINDI_MAP)) {
    if (!hindi.includes(' ') && known.has(normalize(latin))) spellings.add(hindi.normalize('NFC'));
  }
  const byLength = new Map<number, string[]>();
  for (const word of spellings) byLength.set(word.length, [...(byLength.get(word.length) || []), word]);
  return (text: string) => {
    const words = tokenize(text);
    let changed = false;
    let alternatives: string[][] = [[]];
    for (let i = 0; i < words.length; i++) {
      let replacements: string[] | undefined;
      let consumed = 1;
      for (let count = Math.min(3, words.length - i); count >= 1; count--) {
        const span = words.slice(i, i + count);
        // Never rewrite known words or join a phrase made entirely of them.
        if (!span.every(word => hindiWord.test(word)) || span.every(word => known.has(normalize(word)))) continue;
        const joined = span.join('');
        const choices = (byLength.get(joined.length) || []).filter(word => word === joined || closeSound(joined, word));
        if (!choices.length) continue;
        replacements = [...new Set(choices.map(normalize))].sort();
        consumed = count;
        break;
      }
      alternatives = alternatives.flatMap(prefix => (replacements ?? [words[i]]).map(word => [...prefix, word]));
      // Fail closed on unusually ambiguous input rather than choosing an
      // arbitrary subset. The normal product picker remains available.
      if (alternatives.length > 64) return { alternatives: [], changed: false };
      if (replacements !== undefined) { changed = true; i += consumed - 1; }
    }
    return { alternatives: changed ? alternatives.map(words => words.join(' ')) : [], changed };
  };
}
