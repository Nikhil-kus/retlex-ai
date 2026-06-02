import fs from 'fs';

const html = fs.readFileSync('scratch/bing_output.html', 'utf-8');

// Find title tag
const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
console.log('Title:', titleMatch ? titleMatch[1] : 'NONE');

// Find H1 tags
const h1s = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
console.log('H1s:', h1s);

// Count common search result elements
console.log('Occurrences of class "iusc":', (html.match(/class="[^"]*iusc[^"]*"/g) || []).length);
console.log('Occurrences of class "imgpt":', (html.match(/class="[^"]*imgpt[^"]*"/g) || []).length);
console.log('Occurrences of class "mimg":', (html.match(/class="[^"]*mimg[^"]*"/g) || []).length);
console.log('Occurrences of img tags:', (html.match(/<img /g) || []).length);
