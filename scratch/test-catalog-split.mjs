import Fuse from 'fuse.js';

const catalog = [
  { id: '1', name: 'vivel sabun' },
  { id: '2', name: 'Dettol Original Sabun' },
  { id: '3', name: 'Cinthol Lime Sabun' },
  { id: '4', name: 'Maggi Noodles' }
];

const fuse = new Fuse(catalog, {
  keys: ['name', 'localName'],
  threshold: 0.6,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2
});

const parseVoiceItems = (text) => {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const items = [];

    let pendingName = [];
    let pendingQty = 1;

    const commitItem = () => {
      if (pendingName.length > 0) {
        items.push({
          name: pendingName.join(" "),
          quantity: pendingQty,
        });
      }
      pendingName = [];
      pendingQty = 1;
    };

    let i = 0;
    while (i < words.length) {
      const word = words[i];
      const nextWord = words[i + 1] || "";

      let isNumber = false;
      let parsedNum = NaN;
      if (!isNaN(Number(word))) {
          isNumber = true; parsedNum = parseFloat(word);
      }

      if (isNumber) {
        if (pendingName.length > 0) {
           commitItem();
           pendingQty = parsedNum;
        } else {
           pendingQty = parsedNum;
        }
      } else {
        pendingName.push(word);

        if (fuse && nextWord) {
            let isNextNum = false;
            if (!isNaN(Number(nextWord))) isNextNum = true;

            if (!isNextNum) {
                const currentPhrase = pendingName.join(" ");
                const currentResult = fuse.search(currentPhrase);
                const currentScore = currentResult.length > 0 ? currentResult[0].score : 1;
                
                if (currentScore <= 0.45) {
                    const nextPhrase = currentPhrase + " " + nextWord;
                    const nextResult = fuse.search(nextPhrase);
                    const nextScore = nextResult.length > 0 ? nextResult[0].score : 1;
                    
                    console.log(`Checking boundary: [${currentPhrase}] (${currentScore.toFixed(2)}) + [${nextWord}] -> [${nextPhrase}] (${nextScore.toFixed(2)})`);

                    if (nextScore > 0.45) { // tuned threshold
                        console.log(`>> SPLITTING after ${currentPhrase}!`);
                        commitItem();
                    }
                }
            }
        }
      }
      i++;
    }

    commitItem();
    return items;
};

console.log(parseVoiceItems("detol sabun vivel sabun 2 maggi"));
