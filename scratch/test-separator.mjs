const numMap = { 'दो': 2 };
const unitMap = { pc: "pc", kg: "kg", kilo: "kg", 'किलो': "kg", 'पैकेट': "pc" };

const parseVoiceItems = (text) => {
    // PRE-PROCESSING: Normalization for robust parsing
    text = text.toLowerCase().trim()
      .replace(/\b(and|plus)\b/gi, ' | ')
      .replace(/और|तथा|भी|या/g, ' | ')
      .replace(/\b(aur|tatha|bhi|ya)\b/gi, ' | ')
      .replace(/,/g, ' | ');

    const words = text.split(/\s+/).filter(w => w.length > 0);
    const items = [];

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
              i++;
              continue;
          } else {
              commitItem();
              i++;
              continue;
          }
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
              commitItem(parsedNum, finalUnit); // Simplified for test
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

console.log(parseVoiceItems("आता | आता 2 किलो | बिस्कुट | बिस्किट दो पैकेट"));
