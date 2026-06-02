import fs from 'fs';

const html = fs.readFileSync('scratch/jiomart_res.html', 'utf-8');

const regex = /https?:\/\/[^"'\s>]+?pixelbin\.io[^"'\s>]+/gi;
const matches = html.match(regex) || [];
console.log('Total pixelbin matches:', matches.length);

const unique = [...new Set(matches)];
console.log('Unique pixelbin URLs:', unique.length);

unique.slice(0, 30).forEach((url, i) => {
  console.log(`${i + 1}: ${url}`);
});
