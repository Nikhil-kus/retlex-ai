import fs from 'fs';

const html = fs.readFileSync('scratch/jiomart_res.html', 'utf-8');

console.log('HTML Length:', html.length);

// Let's count occurrence of common image extensions
console.log('Occurrences of ".jpg":', (html.match(/\.jpg/g) || []).length);
console.log('Occurrences of ".png":', (html.match(/\.png/g) || []).length);
console.log('Occurrences of ".webp":', (html.match(/\.webp/g) || []).length);

// Find any URLs containing "images" or "product" ending in jpg/png/webp
const matches = [];
const regex = /https?:\/\/[^"'\s>]+?\.(?:jpg|jpeg|png|webp)/gi;
let match;
while ((match = regex.exec(html)) !== null) {
  matches.push(match[0]);
}

console.log(`\nFound ${matches.length} absolute image URLs:`);
const unique = [...new Set(matches)];
console.log(`Unique image URLs: ${unique.length}`);

// Print the first 30 unique URLs
unique.slice(0, 30).forEach((url, i) => {
  console.log(`${i + 1}: ${url}`);
});
