import fs from 'fs';

const html = fs.readFileSync('scratch/everest_res.html', 'utf-8');

// Find all indexes of 'bbassets'
let idx = 0;
const indexes = [];
while (true) {
  idx = html.indexOf('bbassets', idx);
  if (idx === -1) break;
  indexes.push(idx);
  idx += 8;
}

console.log('Total occurrences:', indexes.length);
indexes.slice(14).forEach((pos, i) => {
  console.log(`\n--- Occurrence ${i + 15} at index ${pos} ---`);
  console.log(html.substring(pos - 100, pos + 250));
});
