import https from 'https';

function searchBing(query) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const iuscCount = (data.match(/class="[^"]*iusc[^"]*"/g) || []).length;
        const matches = [];
        const regex = /murl&quot;:&quot;(https:\/\/[^&]+)&quot;/g;
        let match;
        while ((match = regex.exec(data)) !== null) {
          matches.push(match[1]);
        }
        resolve({ iuscCount, urlsCount: matches.length, firstUrls: matches.slice(0, 3) });
      });
    }).on('error', reject);
  });
}

async function run() {
  const queries = [
    'Dettol Soap Cool',
    'Dettol Soap Cool 125g',
    'Dettol Soap Cool site:bigbasket.com',
    'Dettol Soap Cool bigbasket',
    'Dettol Soap'
  ];
  
  for (const q of queries) {
    console.log(`Query: "${q}"`);
    try {
      const res = await searchBing(q);
      console.log(`  iusc elements: ${res.iuscCount}`);
      console.log(`  parsed urls: ${res.urlsCount}`);
      console.log(`  First few urls:`, res.firstUrls);
    } catch (e) {
      console.error(`  Error:`, e.message);
    }
  }
}

run().catch(console.error);
