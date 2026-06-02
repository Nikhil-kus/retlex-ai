import https from "https";

async function getVqd(query) {
  return new Promise((resolve, reject) => {
    https.get(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
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

async function test() {
  const queryText = "Dettol Soap Cool 125g";
  console.log(`Getting VQD for: "${queryText}"`);
  const vqd = await getVqd(queryText);
  if (!vqd) {
    console.error("VQD not found.");
    return;
  }
  console.log(`VQD: ${vqd}`);
  console.log("Searching images...");
  const results = await searchImages(queryText, vqd);
  console.log(`Found ${results.length} images:`);
  results.slice(0, 10).forEach((r, idx) => {
    console.log(`${idx + 1}. Title: ${r.title}`);
    console.log(`   Image URL: ${r.image}`);
    console.log(`   Source: ${r.source}`);
  });
}

test().catch(console.error);
