import fs from 'fs';

const html = fs.readFileSync('scratch/bing_output.html', 'utf-8');

const regex = /<img[^>]+>/g;
const imgs = [];
let match;
while ((match = regex.exec(html)) !== null) {
  imgs.push(match[0]);
}

console.log('Total <img> tags:', imgs.length);
imgs.slice(0, 30).forEach((img, i) => {
  console.log(`${i + 1}: ${img}`);
});
