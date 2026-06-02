const https = require('https');
const fs = require('fs');

async function getVqd(query) {
  return new Promise((resolve, reject) => {
    https.get(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/100.0.4896.127 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const match = data.match(/vqd=([\d-]+)/);
        if (match) resolve(match[1]);
        else resolve(null);
      });
    }).on('error', reject);
  });
}

async function searchImages(query, vqd) {
  return new Promise((resolve, reject) => {
    https.get(`https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/100.0.4896.127 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Referer': 'https://duckduckgo.com/'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.results || []);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const catalogPath = 'src/lib/kirana-catalog.ts';
  let content = fs.readFileSync(catalogPath, 'utf8');
  const regex = /({ name: "([^"]+)",[^}]+)(})/g;
  let matches = [...content.matchAll(regex)];

  for (const match of matches) {
    const fullMatch = match[0];
    const prefix = match[1];
    const name = match[2];

    if (fullMatch.includes('imageUrl:')) continue;

    console.log(`Searching: ${name}`);
    const query = `${name} grocery india png white background`;
    const vqd = await getVqd(query);
    if (!vqd) {
      console.log(`Failed to get vqd for ${name}`);
      continue;
    }
    
    const results = await searchImages(query, vqd);
    if (results.length > 0) {
      const imgUrl = results[0].image;
      console.log(`Found: ${imgUrl}`);
      const newEntry = `${prefix}, imageUrl: "${imgUrl}" }`;
      content = content.replace(fullMatch, newEntry);
    } else {
      console.log(`No images found for ${name}`);
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  
  fs.writeFileSync(catalogPath, content);
  console.log('Catalog updated!');
}

run().catch(console.error);
