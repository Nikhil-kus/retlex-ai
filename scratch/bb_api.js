const https = require('https');

function searchBigBasket(query) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.bigbasket.com/custompage/sysgenpd/?type=pc&slug=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch(e) {
          console.log(data.substring(0, 500));
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

searchBigBasket('aashirvaad-atta').then(console.log).catch(console.error);
