import https from 'https';

function searchYahooWeb(query) {
  return new Promise((resolve, reject) => {
    https.get(`https://search.yahoo.com/search?p=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ html: data, statusCode: res.statusCode });
      });
    }).on('error', reject);
  });
}

async function test() {
  const query = 'Everest Pav Bhaji Masala 50g';
  console.log(`Searching Yahoo Web for: "${query}"`);
  const res = await searchYahooWeb(query);
  console.log('Status Code:', res.statusCode);
  console.log('HTML Length:', res.html.length);
  
  // Extract all links containing bigbasket.com or jiomart.com
  const links = [];
  const regex = /https?:\/\/[^"'\s>]+?(?:bigbasket\.com|jiomart\.com|amazon\.in|blinkit\.com)[^"'\s>]+/gi;
  let match;
  while ((match = regex.exec(res.html)) !== null) {
    links.push(match[0]);
  }
  
  console.log(`Found ${links.length} links:`);
  const unique = [...new Set(links)];
  unique.forEach((link, i) => {
    console.log(`${i + 1}: ${link}`);
  });
}

test().catch(console.error);
