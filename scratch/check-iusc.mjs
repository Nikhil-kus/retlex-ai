import fs from 'fs';

const html = fs.readFileSync('scratch/bing_output.html', 'utf-8');

// Find all matches of class="iusc" or similar
const iuscMatches = html.match(/class="[^"]*iusc[^"]*"/g) || [];
console.log('Occurrences of class iusc:', iuscMatches.length);

// Print the first occurrence details
const idx = html.indexOf('iusc');
if (idx !== -1) {
  console.log('\nAround first iusc:');
  console.log(html.substring(idx - 100, idx + 1000));
}

// Find any links with class "iusc" and extract their attributes
const iuscRegex = /<a[^>]*class="[^"]*iusc[^"]*"[^>]*>/gi;
const links = [];
let match;
while ((match = iuscRegex.exec(html)) !== null) {
  links.push(match[0]);
}
console.log('\nTotal <a class="iusc"> matches:', links.length);
links.slice(0, 10).forEach((link, i) => {
  console.log(`${i + 1}: ${link.substring(0, 300)}`);
});
