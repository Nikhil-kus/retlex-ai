export const parseVoiceItems = (text: string) => {
    // PRE-PROCESSING: Normalization for robust parsing
    text = text.toLowerCase().trim()
      // Remove prices so they aren't parsed as quantities (e.g. "50 wala namak" -> "namak")
      .replace(/(\d+(?:\.\d+)?)\s*(wala|wale|wali|वाला|वाले|वाली|rs|rupees|rupya|rupaye|रुपये|रुपया|रुपए)/gi, ' ')
      .replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(wala|wale|wali|वाला|वाले|वाली|rs|rupees|rupya|rupaye|रुपये|रुपया|रुपए)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/gi, ' ')
      // Use | as a separator for conjunctions and commas
      .replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(and|plus)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/gi, ' | ')
      .replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(और|तथा|भी|या)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/g, ' | ')
      .replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(aur|tatha|bhi|ya)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/gi, ' | ')
      .replace(/,/g, ' | ')
      // Fix misheard numbers (phonetic matching)
      .replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(to|too|tu|two|तो|टो|do|दो)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/gi, ' 2 ')
      .replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(for|four|फ़ॉर|फॉर|फोर)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/gi, ' 4 ')
      .replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(won|one|वन|on|un|an)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/gi, ' 1 ')
      .replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(at|eight|एट|it)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/gi, ' 8 ')
      .replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(teen|three|थ्री|तीन|tin)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/gi, ' 3 ')
      .replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(five|फाइव|पाइप|पांच|panch)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/gi, ' 5 ')
      .replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(six|सिक्स|छह|che|chhe)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/gi, ' 6 ')
      .replace(/(?<=^|[^a-zA-Z0-9_\u0900-\u097F])(ten|टेन|दस|das)(?=$|[^a-zA-Z0-9_\u0900-\u097F])/gi, ' 10 ')
      // Convert compound weights (2 kg 500 g -> 2.5 kg)
      .replace(/(\d+(?:\.\d+)?)\s*(kg|kilo|kilos|किलो)\s+(\d+(?:\.\d+)?)\s*(g|gram|grams|ग्राम)/gi, (match, kg, kgUnit, g, gUnit) => {
        return (parseFloat(kg) + parseFloat(g) / 1000).toString() + " kg";
      })
      .replace(/(\d+(?:\.\d+)?)\s*(l|liter|litre|litres|लीटर)\s+(\d+(?:\.\d+)?)\s*(ml|mili|मिली)/gi, (match, l, lUnit, ml, mlUnit) => {
        return (parseFloat(l) + parseFloat(ml) / 1000).toString() + " l";
      })
      // Hindi weight phrasing
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
      // Hindi fractions
      .replace(/आधा/g, '0.5').replace(/aadha/g, '0.5')
      .replace(/पाव/g, '0.25').replace(/paav/g, '0.25')
      .replace(/सवा/g, '1.25').replace(/sawa/g, '1.25')
      .replace(/डेढ़/g, '1.5').replace(/dedh/g, '1.5')
      .replace(/ढाई/g, '2.5').replace(/dhai/g, '2.5');

    const words = text.split(/\s+/).filter(w => w.length > 0);
    const items: any[] = [];

    const unitMap: any = {
      kg: "kg", kilo: "kg", kilos: "kg", 'किलो': "kg",
      g: "g", gram: "g", grams: "g", 'ग्राम': "g",
      l: "l", liter: "l", litre: "l", litres: "l", 'लीटर': "l",
      ml: "ml", mili: "ml", 'मिली': "ml",
      pc: "pc", pcs: "pc", piece: "pc", pieces: "pc", packet: "pc", packets: "pc", pkt: "pc", pack: "pc", packs: "pc", 'पैकेट': "pc", 'पीस': "pc"
    };

    const numMap: any = {
      'एक': 1, 'do': 2, 'दो': 2, 'dui': 2, 'दुई': 2, 'teen': 3, 'तीन': 3, 'char': 4, 'चार': 4, 'paanch': 5, 'पांच': 5,
      'che': 6, 'छह': 6, 'chhe': 6, 'chay': 6, 'छय': 6, 'saat': 7, 'सात': 7, 'aath': 8, 'आठ': 8, 'nau': 9, 'नौ': 9, 'das': 10, 'दस': 10,
      'gyarah': 11, 'ग्यारह': 11, 'barah': 12, 'बारह': 12, 'bara': 12, 'बारा': 12,
      'tera': 13, 'तेरा': 13, 'तेरह': 13, 'chauda': 14, 'चौदह': 14, 'चौदा': 14,
      'pandrah': 15, 'पंद्रह': 15, 
      'bees': 20, 'बीस': 20, 'ikkis': 21, 'इक्कीस': 21, 'ikais': 21, 'इकाईस': 21,
      'bais': 22, 'बाइस': 22, 'teis': 23, 'तेइस': 23, 'chaubis': 24, 'चौबीस': 24,
      'pachees': 25, 'पच्चीस': 25, 'tees': 30, 'तीस': 30,
      'aadha': 0.5, 'आधा': 0.5, 'paav': 0.25, 'पाव': 0.25, 'sawa': 1.25, 'सवा': 1.25,
      'dedh': 1.5, 'डेढ़': 1.5, 'dhai': 2.5, 'ढाई': 2.5,
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'half': 0.5, 'quarter': 0.25
    };

    let pendingName: string[] = [];
    let pendingQty = 1;
    let pendingUnit = "pc";
    let hasLeadingNumber = false;
    let itemWords: string[] = [];

    const commitItem = (overrideQty?: number, overrideUnit?: string) => {
      if (pendingName.length > 0) {
        items.push({
          name: pendingName.join(" "),
          quantity: overrideQty !== undefined ? overrideQty : pendingQty,
          unit: overrideUnit !== undefined ? overrideUnit : pendingUnit,
          hasExplicitQty: overrideQty !== undefined || pendingQty !== 1 || pendingUnit !== "pc" || hasLeadingNumber,
          rawText: itemWords.join(" ")
        });
      }
      pendingName = [];
      pendingQty = 1;
      pendingUnit = "pc";
      hasLeadingNumber = false;
      itemWords = [];
    };

    const hasNameAhead = (startIndex: number) => {
      for (let j = startIndex; j < words.length; j++) {
        const w = words[j];
        if (w === '|') {
            // Check if what follows the separator is a number
            const nextW = words[j+1];
            if (nextW) {
                let nextIsNum = false;
                if (!isNaN(Number(nextW))) nextIsNum = true;
                else if (numMap[nextW] !== undefined) nextIsNum = true;
                else {
                    const match = nextW.match(/^([\d\.]+)([a-zA-Z]+|किलो|ग्राम|लीटर|पैकेट|पीस)$/i);
                    if (match) nextIsNum = true;
                }
                if (nextIsNum) continue; // skip the separator, it's followed by a number
            }
            return false; // Stop looking ahead, there's a hard boundary
        }
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
          let nextIsNum = false;
          if (nextWord) {
              if (!isNaN(Number(nextWord))) nextIsNum = true;
              else if (numMap[nextWord] !== undefined) nextIsNum = true;
              else {
                  const match = nextWord.match(/^([\d\.]+)([a-zA-Z]+|किलो|ग्राम|लीटर|पैकेट|पीस)$/i);
                  if (match) nextIsNum = true;
              }
          }
          if (nextIsNum) {
              // The next word is a quantity! Ignore this separator so the quantity attaches to current item.
              i++;
              continue;
          } else {
              // The next word is a product name. Commit current item.
              commitItem();
              i++;
              continue;
          }
      }

      itemWords.push(word);

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

      // Keep the spoken unit on the item being committed, not the next item.
      if (isNumber && parsedUnitStr && !isCombined) itemWords.push(nextWord);
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
