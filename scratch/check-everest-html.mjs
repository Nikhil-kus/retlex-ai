import fs from 'fs';

const html = fs.readFileSync('scratch/everest_res.html', 'utf-8');

const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
console.log('Title:', titleMatch ? titleMatch[1].trim() : 'NONE');

// Check H1s
const h1s = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
console.log('H1s:', h1s.map(h => h.replace(/<[^>]+>/g, '').trim()));

// Check if contains "not found" or similar
console.log('Contains "not found":', html.toLowerCase().includes('not found'));
console.log('Contains "error":', html.toLowerCase().includes('error'));
console.log('HTML starting snippet:', html.substring(0, 1000));
