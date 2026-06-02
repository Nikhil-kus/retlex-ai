const https = require('https');

function searchBingImage(query) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, {
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

searchBingImage('Aashirvaad Atta 5kg white background').then(console.log).catch(console.error);
