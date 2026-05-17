const getLevenshteinDistance = (a, b) => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const areWordsSimilar = (w1, w2) => {
  const val1 = w1.trim().toLowerCase();
  const val2 = w2.trim().toLowerCase();
  if (val1 === val2) return true;
  
  // Short words must match exactly to prevent false overlaps (numbers/units like do, to, 1, 2, kg, pc)
  if (val1.length <= 3 || val2.length <= 3) return false;
  
  const dist = getLevenshteinDistance(val1, val2);
  const maxAllowedDist = val1.length >= 6 ? 2 : 1;
  return dist <= maxAllowedDist;
};

const arePhrasesSimilar = (wordsA, wordsB) => {
  if (wordsA.length !== wordsB.length) return false;
  for (let k = 0; k < wordsA.length; k++) {
    if (!areWordsSimilar(wordsA[k], wordsB[k])) return false;
  }
  return true;
};

const mergeOverlappingStrings = (s1, s2) => {
  if (!s1) return s2 || "";
  if (!s2) return s1 || "";
  
  // Strip Android auto-punctuation to fix overlap matching
  s1 = s1.replace(/[.,!?।]/g, '');
  s2 = s2.replace(/[.,!?।]/g, '');

  const s1Lower = s1.trim().toLowerCase();
  const s2Lower = s2.trim().toLowerCase();
  
  if (s1Lower === s2Lower) return s1.trim();
  
  const words1 = s1.trim().split(/\s+/);
  const words2 = s2.trim().split(/\s+/);
  
  let maxOverlap = 0;
  const minLen = Math.min(words1.length, words2.length);
  
  for (let i = 1; i <= minLen; i++) {
    const slice1 = words1.slice(-i);
    const slice2 = words2.slice(0, i);
    if (arePhrasesSimilar(slice1, slice2)) {
      maxOverlap = i;
    }
  }

  if (maxOverlap > 0) {
    return words1.slice(0, words1.length - maxOverlap).concat(words2).join(" ");
  }
  
  return s1.trim() + " | " + s2.trim();
};

// --- Test Cases ---
const runTests = () => {
  const tests = [
    {
      name: "Phonetic duplicate check (biscuit / biscuit do packet)",
      s1: "बिस्कुट",
      s2: "बिस्किट दो पैकेट",
      expected: "बिस्किट दो पैकेट"
    },
    {
      name: "Punctuation strip and exact match",
      s1: "नमकीन | आता,",
      s2: "आता 2 किलो",
      expected: "नमकीन | आता 2 किलो"
    },
    {
      name: "Simple English prefix overlap",
      s1: "everest",
      s2: "everest powder",
      expected: "everest powder"
    },
    {
      name: "Brand name + phonetic mismatch",
      s1: "पारले बिस्कुट",
      s2: "बिस्किट दो पैकेट",
      expected: "पारले बिस्किट दो पैकेट"
    },
    {
      name: "Phonetic typo merge (detol / dettol sabun)",
      s1: "detol",
      s2: "dettol sabun",
      expected: "dettol sabun"
    },
    {
      name: "Perfect matching strings",
      s1: "maggi noodle",
      s2: "maggi noodle",
      expected: "maggi noodle"
    },
    {
      name: "Short words exact match requirement (do vs teen)",
      s1: "do",
      s2: "teen",
      expected: "do | teen"
    },
    {
      name: "Hindi phonetic typo (साबुन vs साबन)",
      s1: "साबुन",
      s2: "साबन 1 पीस",
      expected: "साबन 1 पीस"
    }
  ];

  console.log("=== Running Overlap Merger Tests ===");
  let passedCount = 0;
  for (const t of tests) {
    const result = mergeOverlappingStrings(t.s1, t.s2);
    const passed = result === t.expected;
    if (passed) {
      console.log(`✅ [PASS] ${t.name}`);
      passedCount++;
    } else {
      console.log(`❌ [FAIL] ${t.name}`);
      console.log(`   s1:       "${t.s1}"`);
      console.log(`   s2:       "${t.s2}"`);
      console.log(`   Expected: "${t.expected}"`);
      console.log(`   Got:      "${result}"`);
    }
  }
  console.log(`\nResults: ${passedCount}/${tests.length} tests passed.\n`);
};

runTests();
