import fs from 'fs';

const html = fs.readFileSync('scratch/bing_output.html', 'utf-8');

const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let scripts = [];
while ((match = scriptRegex.exec(html)) !== null) {
  scripts.push(match[1]);
}

console.log('Total script tags:', scripts.length);

scripts.forEach((script, idx) => {
  const len = script.length;
  if (len > 1000) {
    console.log(`Script ${idx + 1} length: ${len}`);
    // Search for keywords like "murl", "tse", "https://"
    const httpCount = (script.match(/https?:\/\//g) || []).length;
    const murlCount = (script.match(/murl/g) || []).length;
    console.log(`  https: ${httpCount}, murl: ${murlCount}`);
    
    // Print snippet if it looks interesting
    if (murlCount > 0 || httpCount > 10) {
      console.log(`  Snippet: ${script.substring(0, 500)}...`);
    }
  }
});
