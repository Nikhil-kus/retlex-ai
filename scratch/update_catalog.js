const https = require('https');
const fs = require('fs');

function searchBingImage(query) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.bing.com/images/search?q=${encodeURIComponent(query + ' bigbasket')}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const match = data.match(/murl&quot;:&quot;(https:\/\/[^&]+)&quot;/);
        resolve(match ? match[1] : null);
      });
    }).on('error', reject);
  });
}

async function updateCatalog() {
  const catalogPath = 'src/lib/kirana-catalog.ts';
  let content = fs.readFileSync(catalogPath, 'utf8');
  
  const regex = /({ name: "([^"]+)",[^}]+)(})/g;
  let matches = [...content.matchAll(regex)];
  
  for (const match of matches) {
    const fullMatch = match[0];
    const prefix = match[1];
    const name = match[2];
    
    if (fullMatch.includes('imageUrl:')) continue; // Already has image
    
    console.log(`Searching for: ${name}`);
    const imgUrl = await searchBingImage(name);
    
    if (imgUrl) {
      console.log(`Found: ${imgUrl}`);
      const newEntry = `${prefix}, imageUrl: "${imgUrl}" }`;
      content = content.replace(fullMatch, newEntry);
    } else {
      console.log(`Not found for: ${name}`);
    }
    
    // Throttle slightly
    await new Promise(r => setTimeout(r, 500));
  }
  
  fs.writeFileSync(catalogPath, content);
  console.log('Catalog updated successfully!');
}

updateCatalog().catch(console.error);
