// Simulates the exact transcript from the screenshot:
// "आता | आता 2 किलो | बिस्कुट | बिस्किट दो पैकेट"

const numMap = {
  'दो': 2, 'तीन': 3, 'चार': 4, 'पांच': 5,
  'do': 2, 'teen': 3, 'char': 4, 'paanch': 5,
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5
};
const unitMap = {
  pc: "pc", pcs: "pc", packet: "pc", pkt: "pc", pack: "pc",
  kg: "kg", kilo: "kg", 'किलो': "kg",
  g: "g", gram: "g",
  l: "l", liter: "l",
  'पैकेट': "pc", 'पीस': "pc"
};

const parseVoiceItems = (text) => {
  text = text.toLowerCase().trim()
    .replace(/[.,!?।]/g, '')  // strip Android punctuation
    .replace(/\b(and|plus)\b/gi, ' | ')
    .replace(/और|तथा|भी|या/g, ' | ')
    .replace(/\b(aur|tatha|bhi|ya)\b/gi, ' | ')
    .replace(/,/g, ' | ');

  const words = text.split(/\s+/).filter(w => w.length > 0);
  const items = [];
  let pendingName = [], pendingQty = 1, pendingUnit = "pc", hasLeadingNumber = false;

  const commitItem = (overrideQty, overrideUnit) => {
    if (pendingName.length > 0) {
      items.push({
        name: pendingName.join(" "),
        quantity: overrideQty !== undefined ? overrideQty : pendingQty,
        unit: overrideUnit !== undefined ? overrideUnit : pendingUnit,
        hasExplicitQty: overrideQty !== undefined || hasLeadingNumber
      });
    }
    pendingName = []; pendingQty = 1; pendingUnit = "pc"; hasLeadingNumber = false;
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
        else if (nextWord.match(/^([\d\.]+)([a-zA-Z]+|किलो|ग्राम|लीटर|पैकेट|पीस)$/i)) nextIsNum = true;
      }
      if (nextIsNum) { i++; continue; }
      else { commitItem(); i++; continue; }
    }

    let isNumber = false, parsedNum = NaN, isCombined = false, parsedUnitStr = "";
    if (!isNaN(Number(word))) { isNumber = true; parsedNum = parseFloat(word); }
    else if (numMap[word] !== undefined) { isNumber = true; parsedNum = numMap[word]; }

    if (isNumber) {
      parsedUnitStr = unitMap[nextWord] || "";
    } else {
      const match = word.match(/^([\d\.]+)([a-zA-Z]+|किलो|ग्राम|लीटर|पैकेट|पीस)$/i);
      if (match && unitMap[match[2]]) {
        parsedNum = parseFloat(match[1]); parsedUnitStr = unitMap[match[2]]; isNumber = true; isCombined = true;
      }
    }

    if (isNumber && !isNaN(parsedNum)) {
      const finalUnit = parsedUnitStr || "pc";
      if (pendingName.length > 0) {
        commitItem(parsedNum, finalUnit);
      } else {
        pendingQty = parsedNum; pendingUnit = finalUnit; hasLeadingNumber = true;
      }
      if (parsedUnitStr && !isCombined) i++;
    } else {
      if (unitMap[word] && pendingName.length === 0) pendingUnit = unitMap[word];
      else pendingName.push(word);
    }
    i++;
  }
  commitItem();
  return items;
};

// Phase 2.5: pre-catalog dedup (mirrors the actual code)
const dedupeSpoken = (normalizedItems) => {
  // Pass 1: exact name dedup
  const exactMap = new Map();
  for (const item of normalizedItems) {
    const nameKey = item.name.trim().toLowerCase();
    if (!exactMap.has(nameKey)) {
      exactMap.set(nameKey, item);
    } else {
      const existing = exactMap.get(nameKey);
      if (item.hasExplicitQty && !existing.hasExplicitQty) {
        exactMap.set(nameKey, item);
      } else if (item.hasExplicitQty && existing.hasExplicitQty && existing.unit === item.unit) {
        existing.quantity += item.quantity;
      }
    }
  }
  let items = Array.from(exactMap.values());

  // Pass 2: stutter-echo/prefix dedup
  const toRemove = new Set();
  for (let a = 0; a < items.length; a++) {
    if (toRemove.has(a) || items[a].hasExplicitQty) continue;
    const nameA = items[a].name.toLowerCase();
    for (let b = 0; b < items.length; b++) {
      if (a === b || toRemove.has(b) || !items[b].hasExplicitQty) continue;
      const nameB = items[b].name.toLowerCase();
      if (nameB.startsWith(nameA) || nameA.startsWith(nameB)) {
        toRemove.add(a);
        break;
      }
    }
  }
  return items.filter((_, idx) => !toRemove.has(idx));
};

console.log("=== Test: aata stutter ===");
const raw1 = parseVoiceItems("आता | आता 2 किलो");
console.log("Parsed (raw):", JSON.stringify(raw1, null, 2));
const deduped1 = dedupeSpoken(raw1);
console.log("After dedup:", JSON.stringify(deduped1, null, 2));
console.log("Expected: 1 item - aata 2 kg ✓\n");

console.log("=== Test: biscuit stutter (different spelling) ===");
const raw2 = parseVoiceItems("बिस्कुट | बिस्किट दो पैकेट");
console.log("Parsed (raw):", JSON.stringify(raw2, null, 2));
const deduped2 = dedupeSpoken(raw2);
console.log("After dedup:", JSON.stringify(deduped2, null, 2));
console.log("Expected: both stay (different names, catalog dedup handles it)\n");

console.log("=== Test: full transcript from screenshot ===");
const raw3 = parseVoiceItems("आता | आता 2 किलो | बिस्कुट | बिस्किट दो पैकेट");
console.log("Parsed (raw):", JSON.stringify(raw3, null, 2));
const deduped3 = dedupeSpoken(raw3);
console.log("After dedup:", JSON.stringify(deduped3, null, 2));
console.log("Expected: 2 items - aata 2kg + biscuit 2pc\n");

console.log("=== Test: normal two-product (should NOT merge) ===");
const raw4 = parseVoiceItems("aata 2 kilo | namkeen 1 packet");
console.log("Parsed:", JSON.stringify(raw4, null, 2));
const deduped4 = dedupeSpoken(raw4);
console.log("After dedup:", JSON.stringify(deduped4, null, 2));
console.log("Expected: 2 items - aata 2kg + namkeen 1pc\n");

console.log("=== Test: two different products without qty (should NOT merge) ===");
const raw5 = parseVoiceItems("namkeen | aata");
console.log("Parsed:", JSON.stringify(raw5, null, 2));
const deduped5 = dedupeSpoken(raw5);
console.log("After dedup:", JSON.stringify(deduped5, null, 2));
console.log("Expected: 2 separate items\n");
