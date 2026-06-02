import fs from 'fs';

const html = fs.readFileSync('scratch/jiomart_res.html', 'utf-8');

// Unescape JSON slashes to make search easier
const unescaped = html.replaceAll('\\/', '/').replaceAll('\\u002F', '/');

// Find all URLs starting with http
const urls = [];
const regex = /https?:\/\/[^"'\s>]+/g;
let match;
while ((match = regex.exec(unescaped)) !== null) {
  urls.push(match[0]);
}

console.log('Total URLs found:', urls.length);
const unique = [...new Set(urls)];
console.log('Unique URLs:', unique.length);

// Print URLs that contain 'original' or 'product' or 'images' or end with jpg/png/webp
const imgUrls = unique.filter(u => {
  const lower = u.toLowerCase();
  return (
    lower.includes('product') ||
    lower.includes('original') ||
    lower.includes('image') ||
    lower.match(/\.(jpg|jpeg|png|webp|gif)/)
  );
});

console.log('Filtered Image/Product URLs count:', imgUrls.length);
imgUrls.slice(0, 50).forEach((u, i) => {
  console.log(`${i + 1}: ${u.substring(0, 200)}`);
});
