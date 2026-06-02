import fs from 'fs';

const html = fs.readFileSync('scratch/bing_output.html', 'utf-8');

const regex = /<img[^>]+>/g;
const imgs = [];
let match;
while ((match = regex.exec(html)) !== null) {
  imgs.push(match[0]);
}

console.log('Total img tags:', imgs.length);

const classCounts = {};
const srcPatterns = [];

imgs.forEach((img, i) => {
  const classMatch = img.match(/class="([^"]+)"/);
  const className = classMatch ? classMatch[1] : 'NO_CLASS';
  classCounts[className] = (classCounts[className] || 0) + 1;
  
  const srcMatch = img.match(/(src|src2)="([^"]+)"/);
  if (srcMatch) {
    srcPatterns.push({ index: i + 1, attr: srcMatch[1], url: srcMatch[2], className, alt: img.match(/alt="([^"]+)"/)?.[1] || '' });
  }
});

console.log('\nClass counts of <img> tags:');
console.log(classCounts);

console.log('\nNon-suggestion / non-icon img tags:');
srcPatterns.forEach(item => {
  if (!item.url.startsWith('https://r.bing.com') && 
      !item.url.startsWith('data:') && 
      !item.url.includes('Dettol Soap Ingredients') &&
      !item.url.includes('Dettol Bathing Soap') &&
      !item.url.includes('Dettol Active Soap') &&
      !item.url.includes('Dettol Body Soap') &&
      !item.url.includes('Dettol Soap Bar') &&
      !item.url.includes('Dettol Cool Soap') &&
      !item.url.includes('Dettol Bath Soap') &&
      !item.url.includes('Dettol Skincare Soap') &&
      !item.url.includes('Dettol Original Soap') &&
      !item.url.includes('Best Dettol Soap') &&
      !item.url.includes('Dettol Products') &&
      !item.url.includes('Dettol New Soap') &&
      !item.url.includes('Dettol Sensitive Soap') &&
      !item.url.includes('Dettol Soap Fresh') &&
      !item.url.includes('Dettol Herbal Soap') &&
      !item.url.includes('Deto Soap') &&
      !item.url.includes('Dettol Soap Green') &&
      !item.url.includes('Dettol Soap Barcode') &&
      !item.url.includes('Gettol Soap') &&
      !item.url.includes('Dettol Mint Soap') &&
      !item.url.includes('Dettol Soap Variants')) {
    console.log(`${item.index}: [${item.attr}] [${item.className}] Alt: "${item.alt}"\n   Url: ${item.url}`);
  }
});
