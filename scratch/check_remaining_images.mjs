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

function extractNestedUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    const params = ['imgurl', 'mediaurl', 'ru', 'url', 'rurl', 'ou'];
    for (const p of params) {
      const val = url.searchParams.get(p);
      if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
        return val;
      }
    }
  } catch (e) {
    const nestedRegex = /(?:imgurl|mediaurl|ru|url|rurl|ou)=(https?%3A%2F%2F[^&"'\s>]+)/i;
    const match = urlStr.match(nestedRegex);
    if (match) {
      try {
        return decodeURIComponent(match[1]);
      } catch (err) {}
    }
  }
  return urlStr;
}

async function testProduct(queryName) {
  console.log(`\n========================================`);
  console.log(`🔎 Investigating: "${queryName}"`);
  console.log(`========================================`);

  try {
    const bUrls = await searchBingImages(queryName);
    const decoded = bUrls.map(u => extractNestedUrl(u));
    console.log(`Bing returned ${decoded.length} urls. First 15:`);
    decoded.slice(0, 15).forEach((u, i) => console.log(`  ${i+1}. ${u}`));
  } catch (e) {
    console.error('Bing failed:', e.message);
  }
}

async function main() {
  const queries = [
    "Special Basant Bahar Agarbatti",
    "Mohandas Govindram Agarbatti",
    "Basant Bahar Agarbatti Katni"
  ];
  for (const q of queries) {
    await testProduct(q);
  }
}

main().catch(console.error);
