// Normalize only numbers next to currency, leaving product names untouched.
const hindi = 'शून्य एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह तेरह चौदह पंद्रह सोलह सत्रह अठारह उन्नीस बीस इक्कीस बाईस तेईस चौबीस पच्चीस छब्बीस सत्ताईस अट्ठाईस उनतीस तीस इकतीस बत्तीस तैंतीस चौंतीस पैंतीस छत्तीस सैंतीस अड़तीस उनतालीस चालीस इकतालीस बयालीस तैंतालीस चवालीस पैंतालीस छियालीस सैंतालीस अड़तालीस उनचास पचास इक्यावन बावन तिरपन चौवन पचपन छप्पन सत्तावन अट्ठावन उनसठ साठ इकसठ बासठ तिरसठ चौंसठ पैंसठ छियासठ सड़सठ अड़सठ उनहत्तर सत्तर इकहत्तर बहत्तर तिहत्तर चौहत्तर पचहत्तर छिहत्तर सतहत्तर अठहत्तर उन्नासी अस्सी इक्यासी बयासी तिरासी चौरासी पचासी छियासी सत्तासी अट्ठासी नवासी नब्बे इक्यानवे बानवे तिरानवे चौरानवे पंचानवे छियानवे सत्तानवे अट्ठानवे निन्यानवे'.split(' ');
const numbers: Record<string, number> = Object.fromEntries(hindi.map((word, n) => [word, n]));
Object.assign(numbers, { पांच: 5, पन्द्रह: 15, बाइस: 22, तेइस: 23, पैतालीस: 45,
  ek: 1, do: 2, teen: 3, char: 4, paanch: 5, das: 10, bees: 20, tees: 30, chalis: 40, paintalis: 45, paintalees: 45, pachas: 50,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 });
const number = `(?:\\d+(?:\\.\\d+)?|${Object.keys(numbers).join('|')}|सौ|sau|hundred|हजार|हज़ार|thousand)`;
const amount = `${number}(?:[ -]+${number})*`;
// Currency-first speech such as "₹55 तीन पैकेट" must stop at 55. A later
// number describes quantity, even when speech recognition inserts a space.
const prefixedAmount = number;
const currency = '(?:रुपये|रुपए|रूपये|रूपए|रुपया|रुपए|रुपैये|rupees?|rupaye|rupya|rs\\.?|₹)';
const boundary = '[\\p{L}\\p{M}\\p{N}]';
function value(phrase: string) {
  let total = 0, current = 0;
  for (const word of phrase.split(/[ -]+/)) {
    if (/^(सौ|sau|hundred)$/.test(word)) current = (current || 1) * 100;
    else if (/^(हजार|हज़ार|thousand)$/.test(word)) { total += (current || 1) * 1000; current = 0; }
    else current += numbers[word] ?? Number(word);
  }
  return total + current;
}
export function markVoicePrices(text: string) {
  return text.toLowerCase().replace(/[०-९]/g, d => String(d.charCodeAt(0) - 0x966))
    .replace(new RegExp(`(?<!${boundary})(${amount})\\s*${currency}(?!${boundary})(?:\\s+(?:का|की|के|वाला|वाली|वाले|wala|wali|wale))?`, 'gu'), (_, n) => ` price:${value(n)} `)
    .replace(new RegExp(`(?<!${boundary})${currency}\\s*(${prefixedAmount})(?!${boundary})`, 'gu'), (_, n) => ` price:${value(n)} `);
}
