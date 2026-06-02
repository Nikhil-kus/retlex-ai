import fs from 'fs';

const html = fs.readFileSync('scratch/bing_output.html', 'utf-8');

// Find all data-src or src attributes containing http
const srcs = [];
const srcRegex = /(src|data-src|data-th)="(https?:\/\/[^"]+)"/g;
let match;
while ((match = srcRegex.exec(html)) !== null) {
  srcs.push({ name: match[1], url: match[2] });
}
console.log('Total src/data-src matches:', srcs.length);
srcs.slice(0, 20).forEach((item, i) => {
  console.log(`${i + 1}: [${item.name}] ${item.url}`);
});

// Let's find any JSON objects or class name patterns
console.log('\nHTML snippets containing "m=" or similar:');
const mRegex = /m="([^"]+)"/g;
const mMatches = [];
while ((match = mRegex.exec(html)) !== null) {
  mMatches.push(match[1]);
}
console.log('m= matches:', mMatches.length);
mMatches.slice(0, 10).forEach((m, i) => {
  console.log(`${i + 1}: ${m.substring(0, 150)}`);
});
