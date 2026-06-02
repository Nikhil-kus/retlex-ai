const parseVoiceItems = (text) => {
    // PRE-PROCESSING: Normalization for robust parsing
    text = text.toLowerCase().trim()
      .replace(/(\d+(?:\.\d+)?)\s*(wala|wale|wali|वाला|वाले|वाली|rs|rupees|rupya|rupaye|रुपये|रुपया|रुपए)/gi, ' ')
      .replace(/\b(wala|wale|wali|वाला|वाले|वाली|rs|rupees|rupya|rupaye|रुपये|रुपया|रुपए)\b/gi, ' ')
      // Use | as a separator for conjunctions
      .replace(/\b(and|plus)\b/gi, ' | ')
      .replace(/और|तथा|भी|या/g, ' | ')
      .replace(/\b(aur|tatha|bhi|ya)\b/gi, ' | ')
      .replace(/,/g, ' | ')
      .replace(/\b(to|too|tu|two|तो|टो|do|दो)\b/gi, ' 2 ')
      .replace(/\b(for|four|फ़ॉर|फॉर|फोर)\b/gi, ' 4 ')
      .replace(/\b(won|one|वन|on|un|an)\b/gi, ' 1 ')
      .replace(/\b(at|eight|एट|it)\b/gi, ' 8 ')
      .replace(/\b(teen|three|थ्री|तीन|tin)\b/gi, ' 3 ')
      .replace(/\b(five|फाइव|पाइप|पांच|panch)\b/gi, ' 5 ')
      .replace(/\b(six|सिक्स|छह|che|chhe)\b/gi, ' 6 ')
      .replace(/\b(ten|टेन|दस|das)\b/gi, ' 10 ');

    const words = text.split(/\s+/).filter(w => w.length > 0);
    const items = [];

    const unitMap = {
      kg: "kg", kilo: "kg", kilos: "kg", 'किलो': "kg",
      g: "g", gram: "g", grams: "g", 'ग्राम': "g",
      l: "l", liter: "l", litre: "l", litres: "l", 'लीटर': "l",
      ml: "ml", mili: "ml", 'मिली': "ml",
      pc: "pc", pcs: "pc", piece: "pc", packet: "pc", pkt: "pc", pack: "pc", 'पैकेट': "pc", 'पीस': "pc"
    };

    const numMap = {
      'एक': 1, 'do': 2, 'दो': 2, 'dui': 2, 'दुई': 2, 'teen': 3, 'तीन': 3, 'char': 4, 'चार': 4, 'paanch': 5, 'पांच': 5,
      'che': 6, 'छह': 6, 'chhe': 6, 'chay': 6, 'छय': 6, 'saat': 7, 'सात': 7, 'aath': 8, 'आठ': 8, 'nau': 9, 'नौ': 9, 'das': 10, 'दस': 10,
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'half': 0.5, 'quarter': 0.25
    };

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

    const hasNameAhead = (startIndex) => {
      for (let j = startIndex; j < words.length; j++) {
        const w = words[j];
        if (w === '|') return true; // Separator means new item
        if (unitMap[w]) continue;
        let isNum = false;
        if (!isNaN(Number(w))) isNum = true;
        else if (numMap[w] !== undefined) isNum = true;
        else {
          const match = w.match(/^([\d\.]+)([a-zA-Z]+|किलो|ग्राम|लीटर|पैकेट|पीस)$/i);
          if (match) isNum = true;
        }
        if (!isNum) return true;
      }
      return false;
    };

    let i = 0;
    while (i < words.length) {
      const word = words[i];
      const nextWord = words[i + 1] || "";

      if (word === '|') {
        commitItem();
        i++;
        continue;
      }

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
            const nextWordIndex = i + (isCombined ? 1 : (parsedUnitStr ? 2 : 1));
            if (hasNameAhead(nextWordIndex)) {
              commitItem();
              pendingQty = parsedNum;
              pendingUnit = finalUnit;
              hasLeadingNumber = true;
            } else {
              pendingQty = parsedNum;
              pendingUnit = finalUnit;
              commitItem();
            }
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

console.log(parseVoiceItems("detol sabun | vivel sabun"));
console.log(parseVoiceItems("detol sabun aur vivel sabun"));
