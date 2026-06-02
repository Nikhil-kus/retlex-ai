import fs from 'fs';

const products = JSON.parse(fs.readFileSync('scratch/new_products_list.json', 'utf-8'));

console.log('Total products:', products.length);

const wrongImagePatterns = [
  'tse1.mm.bing.net/th?q=',
  'slideserve.com',
  'pxfuel.com',
  '5startoolboxstore.com',
  'freepik.com',
  'researchgate.net',
  'wallpaper',
  'img.mandarake.co.jp',
  'pic2.zhimg.com',
  'beamimagination.com',
  'awesomestuff365.com',
  'shozemi.com',
  'cdn.amebaowndme.com'
];

const suspicious = [];
const okay = [];

products.forEach(p => {
  const url = p.imageUrl || '';
  const isSuspicious = wrongImagePatterns.some(pat => url.includes(pat)) || url === '';
  if (isSuspicious) {
    suspicious.push(p);
  } else {
    okay.push(p);
  }
});

console.log('Suspicious or blank image products:', suspicious.length);
console.log('Okay image products:', okay.length);

console.log('\n--- Sample of Suspicious Products ---');
suspicious.slice(0, 30).forEach((p, idx) => {
  console.log(`${idx + 1}. [${p.id}] "${p.name}"\n   Image: "${p.imageUrl}"`);
});

fs.writeFileSync('scratch/suspicious_products.json', JSON.stringify(suspicious, null, 2));
console.log('\nSaved suspicious list to scratch/suspicious_products.json');
