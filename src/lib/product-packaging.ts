type PackagingProduct = {
  name: string;
  localName?: string | null;
  baseUnit?: string;
  baseQuantity?: number;
  packetWeight?: number | null;
  packetUnit?: string | null;
};
const looseWords = /(?<![\p{L}\p{M}\p{N}])(?:loose|khul[aei]|khull[ae]|खुला|खुली|खुले)(?![\p{L}\p{M}\p{N}])/iu;
const packetWords = /(?<![\p{L}\p{M}\p{N}])(?:packets?|packs?|packed|pkt|pieces?|pcs?|पैकेट|पैकेटों|पैक|पीस)(?![\p{L}\p{M}\p{N}])/iu;

export function requestedSaleForm(text: string): 'loose' | 'packet' | undefined {
  if (looseWords.test(text)) return 'loose';
  if (packetWords.test(text)) return 'packet';
  return undefined;
}

export function stripSaleWords(text: string) {
  return text.replace(new RegExp(looseWords.source, 'giu'), ' ')
    .replace(new RegExp(packetWords.source, 'giu'), ' ');
}

export function productSaleForm(product: PackagingProduct): 'loose' | 'packet' {
  const name = `${product.name} ${product.localName || ''}`;
  const explicit = requestedSaleForm(name);
  if (explicit) return explicit;
  if (product.packetWeight && product.packetUnit) return 'packet';
  if (/\d+(?:\.\d+)?\s*(?:kg|g|gm|grams?|ml|l|ltr|किलो|ग्राम|लीटर)(?![\p{L}\p{M}])/iu.test(name)) return 'packet';
  return ['kg', 'g', 'ml', 'l', 'ltr'].includes(product.baseUnit || '') && (product.baseQuantity || 1) === 1 ? 'loose' : 'packet';
}
