import Fuse from 'fuse.js';

const catalog = [
  { id: '1', name: 'vivel sabun' },
  { id: '2', name: 'Dettol Original Sabun' },
  { id: '3', name: 'Cinthol Lime Sabun' }
];

const fuse = new Fuse(catalog, {
  keys: ['name', 'localName'],
  threshold: 0.6,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2
});

const searchName = "detol sabun";
const result = fuse.search(searchName);

let bestMatch = null;
if (result.length && result[0].score <= 0.6) {
    // Wait, let's see what happens if we use the word-hit logic FIRST or alongside
    const words = searchName.split(/\s+/).filter((w) => w.length > 2);
    if (words.length > 0) {
      const productHits = new Map();
      for (const w of words) {
        const subResult = fuse.search(w);
        for (const r of subResult) {
          if (r.score > 0.45) break; 
          const id = r.item.id;
          const existing = productHits.get(id);
          if (!existing) {
            productHits.set(id, { item: r.item, hitCount: 1, bestScore: r.score });
          } else {
            existing.hitCount += 1;
            existing.bestScore = Math.min(existing.bestScore, r.score);
          }
        }
      }
      
      console.log("Product Hits:");
      for (const [id, data] of productHits.entries()) {
          console.log(`ID: ${id}, Name: ${data.item.name}, hitCount: ${data.hitCount}, bestScore: ${data.bestScore}`);
      }

      if (productHits.size > 0) {
        const best = Array.from(productHits.values()).sort((a, b) =>
          b.hitCount !== a.hitCount ? b.hitCount - a.hitCount : a.bestScore - b.bestScore
        )[0];
        console.log("Best by word-hit:", best.item.name);
      }
    }
}
