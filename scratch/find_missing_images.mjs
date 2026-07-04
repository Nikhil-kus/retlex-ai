import fs from 'fs';

const data = JSON.parse(fs.readFileSync('krishna-products-catalog.json', 'utf8'));
const missingImages = data.filter(p => !p.imageUrl || p.imageUrl.trim() === '' || p.imageUrl.includes('placeholder') || p.imageUrl === 'null');

console.log(`Found ${missingImages.length} products without valid images.`);
missingImages.slice(0, 5).forEach(p => {
  console.log(JSON.stringify(p, null, 2));
});
