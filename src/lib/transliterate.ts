/**
 * src/lib/transliterate.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Curated Hinglish-to-Hindi mapping and transliteration logic for Kirana items.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const HINGLISH_TO_HINDI_MAP: Record<string, string> = {
  // Brands
  'lux': 'लक्स',
  'nirma': 'निरमा',
  'navratna': 'नवरत्न',
  'navratan': 'नवरत्न',
  'dettol': 'डिटॉल',
  'detol': 'डिटॉल',
  'everest': 'एवरेस्ट',
  'pushp': 'पुष्प',
  'catch': 'कैच',
  'suhana': 'सुहाना',
  'fortune': 'फॉर्च्यून',
  'dhara': 'धारा',
  'tata': 'टाटा',
  'amul': 'अमूल',
  'sanchi': 'सांची',
  'patanjali': 'पतंजलि',
  'colgate': 'कोलगेट',
  'pepsodent': 'पेप्सोडेंट',
  'surf': 'सर्फ',
  'rin': 'रिन',
  'tide': 'टाइड',
  'ghadi': 'घड़ी',
  'harpic': 'हार्पिक',
  'lizol': 'लाइज़ोल',
  'silver': 'सिल्वर',
  'coin': 'कॉइन',
  'ruchi': 'रुचि',
  'star': 'स्टार',
  'ruchistar': 'रुचि स्टार',
  'krati': 'कृति',
  'kriti': 'कृति',
  'tan': 'तन',
  'man': 'मन',
  'wild': 'वाइल्ड',
  'stone': 'स्टोन',
  'hmt': 'एचएमटी',
  'dove': 'डव',
  'nima': 'निमा',
  'lifebuoy': 'लाइफबॉय',
  'nip': 'निप',
  'whitix': 'व्हाइटिक्स',
  
  // Spices, Staples & Groceries
  'sabun': 'साबुन', 'saboon': 'साबुन', 'soap': 'साबुन', 'sop': 'साबुन',
  'tel': 'तेल', 'oil': 'तेल',
  'doodh': 'दूध', 'milk': 'दूध',
  'atta': 'आटा', 'aata': 'आटा',
  'chawal': 'चावल', 'rice': 'चावल',
  'dal': 'दाल', 'daal': 'दाल',
  'namak': 'नमक', 'salt': 'नमक',
  'chini': 'चीनी', 'shakkar': 'चीनी', 'sugar': 'चीनी',
  'chai': 'चाय', 'tea': 'चाय', 'patti': 'चाय',
  'masala': 'मसाला', 'masale': 'मसाला',
  'mirch': 'मिर्च', 'mirchi': 'मिर्च', 'chilli': 'मिर्च', 'chili': 'मिर्च',
  'haldi': 'हल्दी', 'turmeric': 'हल्दी',
  'dhaniya': 'धनिया', 'coriander': 'धनिया',
  'jeera': 'जीरा', 'cumin': 'जीरा',
  'dahi': 'दही', 'curd': 'दही',
  'paneer': 'पनीर',
  'biscuit': 'बिस्कुट', 'biscut': 'बिस्कुट', 'biscuits': 'बिस्कुट',
  'shampoo': 'शैम्पू', 'shampoe': 'शैम्पू',
  'powder': 'पाउडर', 'powdr': 'पाउडर',
  'bar': 'बार',
  'liquid': 'लिक्विड',
  'handwash': 'हैंडवॉश',
  'sanitizer': 'सैनिटाइज़र',
  'laundry': 'कपड़े',
  'cleaner': 'क्लीनर',
  'comb': 'कंघी',
  'paste': 'पेस्ट',
  'brush': 'ब्रश',
  'makhana': 'मखाना',
  'daliya': 'दलिया',
  'rava': 'रवा',
  'sooji': 'सूजी',
  'suji': 'सूजी',
  'poha': 'पोहा',
  'maida': 'मैदा',
  'besan': 'बेसन',
  'ghee': 'घी',
  'chana': 'चना',
  'chhana': 'चना',
  'chhola': 'छोला',
  'sabut': 'साबुत',
  'chhilka': 'छिलका',
  'hari': 'हरी',
  'khula': 'खुला',
  'khule': 'खुला',
  'packet': 'पैकेट',
  'pkt': 'पैकेट',
  'detergent': 'डिटर्जेंट',
  'wash': 'वॉश',
  'kolam': 'कोलम',
  'jeeravan': 'जीरावन',
  'glass': 'ग्लास',
  'rose': 'रोज'
};

/**
 * Transliterates Hinglish/Latin query into Hindi/Devanagari query.
 * E.g., "lux sabun" -> "लक्स साबुन"
 */
export function transliterateHinglishToHindi(text: string): string {
  if (!text) return "";
  const words = text.toLowerCase().split(/\s+/);
  const mapped = words.map(w => HINGLISH_TO_HINDI_MAP[w] || w);
  return mapped.join(" ");
}
