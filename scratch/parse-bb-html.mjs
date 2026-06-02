import fs from 'fs';
import https from 'https';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', reject);
  });
}

async function run() {
  const url = 'https://www.bigbasket.com/pd/270770/dettol-germ-protection-bathing-bar-soap-cool-125-g/';
  console.log('Fetching:', url);
  const html = await fetchPage(url);
  
  // Write to a temporary file for analysis
  fs.writeFileSync('scratch/bb_page.html', html);
  
  // Find occurrences of media/uploads/p/
  const matches = [];
  const regex = /[^"'`>\s]*media\/uploads\/p\/[^"'`>\s]*/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    matches.push(match[0]);
  }
  
  console.log(`\nFound ${matches.length} matches for media/uploads/p/:`);
  const unique = [...new Set(matches)];
  console.log(`Unique matches: ${unique.length}`);
  unique.slice(0, 20).forEach((m, idx) => {
    console.log(`${idx + 1}: ${m}`);
  });
}

run().catch(console.error);
