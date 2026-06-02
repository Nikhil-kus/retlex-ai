import fs from 'fs';

const html = fs.readFileSync('scratch/everest_res.html', 'utf-8');

console.log('Occurrences of "bbassets":', (html.match(/bbassets/g) || []).length);

// Print snippets of the first few occurrences of "bbassets"
let idx = 0;
for (let i = 0; i < 15; i++) {
  idx = html.indexOf('bbassets', idx);
  if (idx === -1) break;
  console.log(`\n--- Occurrence ${i + 1} at index ${idx} ---`);
  console.log(html.substring(idx - 100, idx + 200));
  idx += 8;
}
