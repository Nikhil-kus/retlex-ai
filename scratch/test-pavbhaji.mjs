import https from 'https';

function searchBingImages(query) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const matches = [];
        const regex = /murl&quot;:&quot;(https:\/\/[^&]+)&quot;/g;
        let match;
        while ((match = regex.exec(data)) !== null) {
          matches.push(match[1]);
        }
        resolve(matches);
      });
    }).on('error', reject);
  });
}

async function run() {
  const q = 'Everest Pav Bhaji Masala 50g grocery';
  console.log(`Searching: ${q}`);
  const urls = await searchBingImages(q);
  console.log(`Found ${urls.length} URLs:`);
  urls.slice(0, 15).forEach((url, i) => {
    console.log(`${i + 1}: ${url}`);
  });
}

run().catch(console.error);
