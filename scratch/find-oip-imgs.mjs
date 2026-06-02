import fs from 'fs';

const html = fs.readFileSync('scratch/bing_output.html', 'utf-8');

const regex = /<img[^>]+>/g;
const imgs = [];
let match;
while ((match = regex.exec(html)) !== null) {
  imgs.push(match[0]);
}

console.log('Total img tags:', imgs.length);

const oipImgs = imgs.filter(img => img.includes('/th/id/') || img.includes('OIP'));
console.log('Img tags with /th/id/ or OIP:', oipImgs.length);
oipImgs.forEach((img, i) => {
  console.log(`${i + 1}: ${img}`);
});
