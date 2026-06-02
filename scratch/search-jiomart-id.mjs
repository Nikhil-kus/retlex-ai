import fs from 'fs';

const html = fs.readFileSync('scratch/jiomart_res.html', 'utf-8');
const id = '490005440';

console.log(`Searching for ID "${id}":`);
let idx = 0;
let occurrences = 0;
while (true) {
  idx = html.indexOf(id, idx);
  if (idx === -1) break;
  occurrences++;
  console.log(`\n--- Occurrence ${occurrences} at index ${idx} ---`);
  console.log(html.substring(idx - 200, idx + 200));
  idx += id.length;
}
