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

/**
 * Reverse map: Hindi/Devanagari word → most common Hinglish/English equivalent.
 * Used so that a Hindi voice query can also match English-named catalog products.
 * E.g., "काली तिल" -> "kali til" which Fuse can match against "Kali Til"
 */
export const HINDI_TO_HINGLISH_MAP: Record<string, string> = {
  // Reverse of HINGLISH_TO_HINDI_MAP (most useful entries only)
  'लक्स': 'lux',
  'निरमा': 'nirma',
  'नवरत्न': 'navratna',
  'डिटॉल': 'dettol',
  'एवरेस्ट': 'everest',
  'पुष्प': 'pushp',
  'सुहाना': 'suhana',
  'फॉर्च्यून': 'fortune',
  'धारा': 'dhara',
  'टाटा': 'tata',
  'अमूल': 'amul',
  'सांची': 'sanchi',
  'पतंजलि': 'patanjali',
  'कोलगेट': 'colgate',
  'सर्फ': 'surf',
  'रिन': 'rin',
  'टाइड': 'tide',
  'घड़ी': 'ghadi',
  'हार्पिक': 'harpic',
  'रुचि': 'ruchi',
  'डव': 'dove',
  'निमा': 'nima',
  'साबुन': 'sabun',
  'तेल': 'tel',
  'दूध': 'doodh',
  'आटा': 'atta',
  'चावल': 'chawal',
  'दाल': 'dal',
  'नमक': 'namak',
  'चीनी': 'chini',
  'चाय': 'chai',
  'मसाला': 'masala',
  'मिर्च': 'mirch',
  'हल्दी': 'haldi',
  'धनिया': 'dhaniya',
  'जीरा': 'jeera',
  'दही': 'dahi',
  'पनीर': 'paneer',
  'बिस्कुट': 'biscuit',
  'शैम्पू': 'shampoo',
  'पाउडर': 'powder',
  'मखाना': 'makhana',
  'दलिया': 'daliya',
  'सूजी': 'sooji',
  'पोहा': 'poha',
  'मैदा': 'maida',
  'बेसन': 'besan',
  'घी': 'ghee',
  'चना': 'chana',
  'साबुत': 'sabut',
  'हरी': 'hari',
  'खुला': 'khula',
  'पैकेट': 'packet',
  'डिटर्जेंट': 'detergent',
  // Common product descriptors spoken in Hindi
  'काली': 'kali',
  'काला': 'kala',
  'सफेद': 'safed',
  'लाल': 'lal',
  'हरा': 'hara',
  'तिल': 'til',
  'सरसों': 'sarson',
  'राई': 'rai',
  'अजवाइन': 'ajwain',
  'मेथी': 'methi',
  'सौंफ': 'saunf',
  'कलौंजी': 'kalonji',
  'इलायची': 'elaichi',
  'लौंग': 'laung',
  'दालचीनी': 'dalchini',
  'काली मिर्च': 'kali mirch',
  'अदरक': 'adrak',
  'लहसुन': 'lahsun',
  'प्याज': 'pyaaz',
  'आलू': 'aloo',
  'मूंग': 'moong',
  'उड़द': 'urad',
  'अरहर': 'arhar',
  'मसूर': 'masoor',
  'राजमा': 'rajma',
  'चने': 'chane',
  'मूंगफली': 'moongfali',
  'नारियल': 'nariyal',
  'सोयाबीन': 'soyabean',
  'सूरजमुखी': 'surajmukhi',
  'बादाम': 'badam',
  'काजू': 'kaju',
  'किशमिश': 'kishmish',
  'खजूर': 'khajoor',
  'नूडल्स': 'noodles',
  'मैगी': 'maggi',
  'सेंवई': 'sewai',
  'खीर': 'kheer',
  'कॉफी': 'coffee',
  'हॉर्लिक्स': 'horlicks',
  'बोर्नविटा': 'bornvita',
};

/**
 * Transliterates a Hindi/Devanagari query into its Hinglish/English equivalent.
 * E.g., "काली तिल" -> "kali til"
 * Used to match Hindi voice queries against English-named catalog products.
 */
export function transliterateHindiToHinglish(text: string): string {
  if (!text) return "";
  // First try exact multi-word phrases
  const trimmed = text.toLowerCase().trim();
  if (HINDI_TO_HINGLISH_MAP[trimmed]) return HINDI_TO_HINGLISH_MAP[trimmed];
  // Then map word-by-word
  const words = trimmed.split(/\s+/);
  const mapped = words.map(w => HINDI_TO_HINGLISH_MAP[w] || w);
  return mapped.join(" ");
}
