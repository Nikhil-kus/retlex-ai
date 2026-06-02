const https = require('https');

function searchYahooImage(query) {
  return new Promise((resolve, reject) => {
    https.get(`https://images.search.yahoo.com/search/images?p=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Yahoo stores images in src='...' or data-src='...'
        const match = data.match(/<img[^>]+src='(https:\/\/[^']+)'/i);
        resolve(match ? match[1] : null);
      });
    }).on('error', reject);
  });
}

searchYahooImage('Aashirvaad Atta 5kg grocery india').then(console.log).catch(console.error);
