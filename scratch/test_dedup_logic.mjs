// test_dedup_logic.mjs

function extractWeight(name) {
  const match = name.match(/(\d+)\s*(kg|g|ml|l|kg|packet|pouch|tin|jar|bar|sachet)/i);
  if (match) {
    let unit = match[2].toLowerCase();
    if (unit === 'kg' || unit === 'l' || unit === 'ml' || unit === 'g') {
      return { weight: parseInt(match[1]), unit };
    }
  }
  return null;
}

function extractBrand(name) {
  const nameLower = name.toLowerCase();
  const brands = ['everest', 'pushp', 'catch', 'suhana', 'dettol', 'nirma', 'kriti', 'ruchi star', 'ruchi', 'silver coin', 'tan man', 'ghadi', 'surf excel', 'surf', 'rin', 'tide', 'upadhyay'];
  for (const b of brands) {
    if (nameLower.includes(b)) return b;
  }
  return null;
}

function normalizeProductName(name) {
  let norm = name.toLowerCase();
  
  // Replace synonyms
  norm = norm.replace(/turmeric/g, 'haldi');
  norm = norm.replace(/coriander/g, 'dhaniya');
  norm = norm.replace(/cumin/g, 'jeera');
  norm = norm.replace(/chilli|chillies|chili/g, 'mirch');
  norm = norm.replace(/chhola chhana|kabuli chana/g, 'chana');
  
  // Remove weights/sizes
  norm = norm.replace(/\d+\s*(kg|g|ml|l|kg|packet|pouch|tin|jar|bar|sachet)\b/gi, '');
  
  // Remove descriptors
  const stopwords = ['powder', 'special', 'brand', 'pure', '100%', 'classic', 'premium', 'easy wash', 'active', 'detergent', 'antiseptic', 'liquid', 'soap'];
  for (const w of stopwords) {
    const rx = new RegExp('\\b' + w + '\\b', 'gi');
    norm = norm.replace(rx, '');
  }
  
  // Clean spacing
  norm = norm.replace(/[^a-z0-9\s]/g, '');
  norm = norm.trim().replace(/\s+/g, ' ');
  return norm;
}

function isDuplicate(candidate, existingList) {
  const candNameNorm = normalizeProductName(candidate.name);
  const candWeightInfo = extractWeight(candidate.name) || { weight: candidate.packetWeight, unit: candidate.packetUnit };
  const candBrand = candidate.brand?.toLowerCase() || extractBrand(candidate.name);

  for (const existing of existingList) {
    const existNameNorm = normalizeProductName(existing.name);
    const existWeightInfo = extractWeight(existing.name) || { weight: existing.packetWeight, unit: existing.packetUnit };
    const existBrand = existing.brand?.toLowerCase() || extractBrand(existing.name);

    const cWeight = candWeightInfo?.weight;
    const cUnit = candWeightInfo?.unit;
    const eWeight = existWeightInfo?.weight;
    const eUnit = existWeightInfo?.unit;

    // Direct string match comparison
    const cNameClean = candidate.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const eNameClean = existing.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cNameClean === eNameClean) {
      return { duplicate: true, matchedWith: existing.name, reason: 'Direct clean name match' };
    }

    if (candBrand === existBrand && candNameNorm === existNameNorm && cWeight === eWeight && cUnit === eUnit) {
      return { duplicate: true, matchedWith: existing.name, reason: `Normalized match (Brand: ${candBrand}, Name: ${candNameNorm}, Weight: ${cWeight}${cUnit})` };
    }
  }
  return { duplicate: false };
}

// TEST CASE RUN
const existing = [
  { name: "Catch Coriander Powder 100g" },
  { name: "Catch Cumin Powder Jeera 100g" },
  { name: "Catch Kashmiri Mirch Powder 100g" },
  { name: "Catch Red Chilli Powder 100g" },
  { name: "Catch Turmeric Powder 100g" },
  { name: "Everest Coriander Powder 100g" },
  { name: "Everest Cumin Powder 100g" },
  { name: "Everest Kashmirilal Chilli Powder 100g" },
  { name: "Everest Tikhalal Chilli Powder 100g" },
  { name: "Everest Turmeric Powder 100g" },
  { name: "Pushp Coriander Powder 500g" },
  { name: "Pushp Red Chilli Powder 500g" },
  { name: "Pushp Turmeric Powder 500g" },
  { name: "Ghadi Detergent Powder 5kg" }
];

const candidates = [
  { name: "Everest Haldi Powder 100g", brand: "Everest", packetWeight: 100, packetUnit: "g" },
  { name: "Everest Haldi Powder 50g", brand: "Everest", packetWeight: 50, packetUnit: "g" },
  { name: "Pushp Haldi Powder 500g", brand: "Pushp", packetWeight: 500, packetUnit: "g" },
  { name: "Pushp Haldi Powder 200g", brand: "Pushp", packetWeight: 200, packetUnit: "g" },
  { name: "Everest Dhaniya Powder 100g", brand: "Everest", packetWeight: 100, packetUnit: "g" },
  { name: "Ghadi Detergent Powder 3kg", brand: "Ghadi", packetWeight: 3, packetUnit: "kg" },
  { name: "Ghadi Detergent Powder 5kg", brand: "Ghadi", packetWeight: 5, packetUnit: "kg" }
];

console.log("=== RUNNING DEDUPLICATION TESTS ===");
for (const cand of candidates) {
  const result = isDuplicate(cand, existing);
  console.log(`Candidate: "${cand.name}"`);
  if (result.duplicate) {
    console.log(`  ❌ DUPLICATE of "${result.matchedWith}" (Reason: ${result.reason})`);
  } else {
    console.log(`  ✅ KEEP`);
  }
}
