import fs from 'fs';

const html = fs.readFileSync('scratch/bing_output.html', 'utf-8');

console.log('HTML Length:', html.length);

// Let's count how many times "murl" appears
const murlMatches = html.match(/murl/g) || [];
console.log('Occurrences of "murl":', murlMatches.length);

// Let's print around the first few occurrences of "murl"
let idx = 0;
for (let i = 0; i < 5; i++) {
  idx = html.indexOf('murl', idx);
  if (idx === -1) break;
  console.log(`\n--- Match ${i + 1} at index ${idx} ---`);
  console.log(html.substring(idx - 50, idx + 200));
  idx += 4;
}

// Let's search for image file extensions in quotes
const imgUrls = [];
const regex = /"https:\/\/[^"]+\.(jpg|jpeg|png|webp)"/gi;
let match;
while ((match = regex.exec(html)) !== null) {
  imgUrls.push(match[0]);
}
console.log('\nTotal simple image URL matches:', imgUrls.length);
imgUrls.slice(0, 10).forEach((url, i) => {
  console.log(`${i + 1}: ${url}`);
});
