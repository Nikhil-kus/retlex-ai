import { transliterateHinglishToHindi } from './transliterate';
import type { VoiceProduct } from './voice-product-matcher';

// Grammar changes the decoder's choices; it cannot add pronunciations to the model.
// Never silently shorten an unsupported brand name to a generic product word.
export function spokenName(value: string): string {
  return transliterateHinglishToHindi(value.normalize('NFC').toLowerCase()
    .replace(/\d+(?:\.\d+)?\s*(?:kg|gm|g|ml|ltr|l|pcs?|pkt)\b/gi, ' ')
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim());
}

const orderWords = 'शून्य एक दो तीन चार पांच पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस तीस चालीस पचास साठ सत्तर अस्सी नब्बे सौ हजार आधा आधी पाव डेढ़ ढाई सवा साढ़े किलो ग्राम लीटर मिलीलीटर पैकेट पैक पीस बोतल दर्जन रुपये रुपए रूपए का की के और फिर वाला वाली खुला छोटी छोटा बड़ी बड़ा मीडियम';

export function buildVoskGrammar(products: readonly VoiceProduct[], vocabulary: ReadonlySet<string>) {
  const phrases = new Set<string>();
  const unsupported: string[] = [];
  let covered = 0;
  for (const product of products) {
    const variants = [product.name, product.localName, ...(product.localAliases || [])]
      .filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
      .map(spokenName);
    const supported = variants.filter(name => name && name.split(' ').every(word => vocabulary.has(word)));
    if (supported.length) {
      covered++;
      supported.forEach(name => phrases.add(name));
    } else {
      unsupported.push(product.name);
    }
  }
  const productPhrases = phrases.size;
  orderWords.split(' ').filter(word => vocabulary.has(word)).forEach(word => phrases.add(word));
  if (vocabulary.has('[unk]')) phrases.add('[unk]');
  return { phrases: [...phrases].sort(), covered, unsupported, productPhrases };
}

/** Unknown speech is rejected rather than forced into an inventory item. */
export function acceptedVoskText(text: string, words?: { conf: number }[]): string {
  if (!text.trim() || text.includes('[unk]')) return '';
  if (words?.length && words.reduce((sum, word) => sum + word.conf, 0) / words.length < 0.65) return '';
  return text.trim();
}
