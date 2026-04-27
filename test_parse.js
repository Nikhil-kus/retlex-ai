const Fuse = require('fuse.js'); // Assuming fuse.js is installed or we can just mock the parseVoiceItems
const catalog = [{ id: '1', name: 'Haldi Powder', localName: 'हल्दी', baseUnit: 'g', baseQuantity: 1, price: 30 }];

const parseVoiceItems = (text) => {
    // PRE-PROCESSING: Normalization for robust parsing
    text = text.toLowerCase().trim()
      .replace(/(\d+(?:\.\d+)?)\s*(wala|wale|wali|वाला|वाले|वाली|rs|rupees|rupya|rupaye|रुपये|रुपया|रुपए)/gi, ' ')
      .replace(/\b(wala|wale|wali|वाला|वाले|वाली|rs|rupees|rupya|rupaye|रुपये|रुपया|रुपए)\b/gi, ' ')
      .replace(/\b(and|plus)\b/gi, ' ')
      .replace(/और|तथा|भी|या/g, ' ')
      .replace(/\b(aur|tatha|bhi|ya)\b/gi, ' ')
      .replace(/\b(to|too|tu|two|तो|टो|do|दो)\b/gi, ' 2 ')
      .replace(/\b(for|four|फ़ॉर|फॉर|फोर)\b/gi, ' 4 ')
      .replace(/\b(won|one|वन|on|un|an)\b/gi, ' 1 ')
      .replace(/\b(at|eight|एट|it)\b/gi, ' 8 ')
      .replace(/\b(teen|three|थ्री|तीन|tin)\b/gi, ' 3 ')
      .replace(/\b(five|फाइव|पाइप|पांच|panch)\b/gi, ' 5 ')
      .replace(/\b(six|सिक्स|छह|che|chhe)\b/gi, ' 6 ')
      .replace(/\b(ten|टेन|दस|das)\b/gi, ' 10 ')
      .replace(/(\d+(?:\.\d+)?)\s*(kg|kilo|kilos|किलो)\s+(\d+(?:\.\d+)?)\s*(g|gram|grams|ग्राम)/gi, (match, kg, kgUnit, g, gUnit) => {
        return (parseFloat(kg) + parseFloat(g) / 1000).toString() + " kg";
      })
      .replace(/(\d+(?:\.\d+)?)\s*(l|liter|litre|litres|लीटर)\s+(\d+(?:\.\d+)?)\s*(ml|mili|मिली)/gi, (match, l, lUnit, ml, mlUnit) => {
        return (parseFloat(l) + parseFloat(ml) / 1000).toString() + " l";
      })
      .replace(/ढाई\s*सौ/g, '250').replace(/dhai\s*sau/g, '250')
      .replace(/डेढ़\s*सौ/g, '150').replace(/dedh\s*sau/g, '150')
      .replace(/एक\s*सौ\s*पचास/g, '150').replace(/ek\s*sau\s*pachas/g, '150')
      .replace(/दो\s*सौ\s*पचास/g, '250').replace(/do\s*sau\s*pachas/g, '250')
      .replace(/एक\s*सौ/g, '100').replace(/ek\s*sau/g, '100')
      .replace(/दो\s*सौ/g, '200').replace(/do\s*sau/g, '200')
      .replace(/तीन\s*सौ/g, '300').replace(/teen\s*sau/g, '300')
      .replace(/चार\s*सौ/g, '400').replace(/char\s*sau/g, '400')
      .replace(/पांच\s*सौ/g, '500').replace(/paanch\s*sau/g, '500')
      .replace(/छह\s*सौ/g, '600').replace(/che\s*sau/g, '600')
      .replace(/सात\s*सौ/g, '700').replace(/saat\s*sau/g, '700')
      .replace(/आठ\s*सौ/g, '800').replace(/aath\s*sau/g, '800')
      .replace(/नौ\s*सौ/g, '900').replace(/nau\s*sau/g, '900')
      .replace(/आधा/g, '0.5').replace(/aadha/g, '0.5')
      .replace(/पाव/g, '0.25').replace(/paav/g, '0.25')
      .replace(/सवा/g, '1.25').replace(/sawa/g, '1.25')
      .replace(/डेढ़/g, '1.5').replace(/dedh/g, '1.5')
      .replace(/ढाई/g, '2.5').replace(/dhai/g, '2.5');

    const words = text.split(/\s+/).filter(w => w.length > 0);
    const items = [];

    const unitMap = {
      kg: "kg", kilo: "kg", kilos: "kg", 'किलो': "kg",
      g: "g", gram: "g", grams: "g", 'ग्राम': "g",
      l: "l", liter: "l", litre: "l", litres: "l", 'लीटर': "l",
      ml: "ml", mili: "ml", 'मिली': "ml",
      pc: "pc", pcs: "pc", piece: "pc", packet: "pc", pkt: "pc", pack: "pc", 'पैकेट': "pc", 'पीस': "pc"
    };

    const numMap = { /* mock */ };

    let pendingName = [];
    let pendingQty = 1;
    let pendingUnit = "pc";
    let hasLeadingNumber = false;

    const commitItem = (overrideQty, overrideUnit) => {
      if (pendingName.length > 0) {
        items.push({
          name: pendingName.join(" "),
          quantity: overrideQty !== undefined ? overrideQty : pendingQty,
          unit: overrideUnit !== undefined ? overrideUnit : pendingUnit,
        });
      }
      pendingName = [];
      pendingQty = 1;
      pendingUnit = "pc";
      hasLeadingNumber = false;
    };

    let i = 0;
    while (i < words.length) {
      const word = words[i];
      const nextWord = words[i + 1] || "";

      let isNumber = false;
      let parsedNum = NaN;
      let isCombined = false;
      let parsedUnitStr = "";

      if (!isNaN(Number(word))) {
          isNumber = true;
          parsedNum = parseFloat(word);
      } else if (numMap[word] !== undefined) {
          isNumber = true;
          parsedNum = numMap[word];
      }

      if (isNumber) {
        parsedUnitStr = unitMap[nextWord] || "";
      } else {
        const match = word.match(/^([\d\.]+)([a-zA-Z]+|किलो|ग्राम|लीटर|पैकेट|पीस)$/i);
        if (match) {
           parsedNum = parseFloat(match[1]);
           if (unitMap[match[2]]) {
               parsedUnitStr = unitMap[match[2]];
               isNumber = true;
               isCombined = true;
           }
        }
      }

      if (isNumber && !isNaN(parsedNum)) {
        let finalUnit = parsedUnitStr || "pc";
        
        if (pendingName.length > 0) {
          if (hasLeadingNumber) {
            commitItem();
            pendingQty = parsedNum;
            pendingUnit = finalUnit;
            hasLeadingNumber = true;
          } else {
            commitItem(parsedNum, finalUnit);
          }
        } else {
          pendingQty = parsedNum;
          pendingUnit = finalUnit;
          hasLeadingNumber = true;
        }

        if (parsedUnitStr && !isCombined) {
           i++; 
        }
      } else {
        if (unitMap[word] && pendingName.length === 0) {
           pendingUnit = unitMap[word];
        } else {
           pendingName.push(word);
        }
      }
      i++;
    }

    commitItem();
    return items;
};

console.log("Parsed:", parseVoiceItems("हल्दी खुला 200 ग्राम और पैकेट"));
