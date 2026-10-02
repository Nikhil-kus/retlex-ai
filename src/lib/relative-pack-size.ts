export type RelativePackSize = 'small' | 'large' | 'medium';

const sizeWords = /(?<![\p{L}\p{M}\p{N}])(?:chh?ot[aei]|छोटा|छोटी|छोटे|bad[aei]|बड़ा|बड़ी|बड़े|बडा|बडी|बडे|small|large|big|medium|midium|मीडियम|मध्यम)(?![\p{L}\p{M}\p{N}])(?:\s+(?:size|साइज|साइज़|wala|wali|wale|वाला|वाली|वाले)(?![\p{L}\p{M}\p{N}]))?/giu;

export function relativePackSize(text: string): RelativePackSize | undefined {
  const word = [...text.normalize('NFD').matchAll(sizeWords)][0]?.[0].split(/\s+/)[0].toLowerCase();
  if (!word) return undefined;
  if (/^(?:ch|छ|small)/u.test(word)) return 'small';
  if (/^(?:medium|midium|म)/u.test(word)) return 'medium';
  return 'large';
}

export function stripRelativePackSize(text: string) {
  return text.normalize('NFD').replace(sizeWords, ' ').replace(/\s+/g, ' ').trim();
}
