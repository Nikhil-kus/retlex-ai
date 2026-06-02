import https from 'https';
import fs from 'fs';

function fetchUrl(url, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      ...customHeaders
    };
    
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ html: data, statusCode: res.statusCode });
      });
    }).on('error', reject);
  });
}

async function test() {
  const url = 'https://www.bigbasket.com/pd/20000392/everest-tikhalal-chilli-powder-50-g/';
  console.log('Fetching:', url);
  const res = await fetchUrl(url);
  console.log('Status Code:', res.statusCode);
  console.log('HTML Length:', res.html.length);
  
  // Find bbassets image matches
  const regex = /https?:\/\/(?:www\.)?bbassets\.com\/media\/uploads\/p\/(?:l|m|s|xl|xxl)\/[^"'\s>?]+/g;
  const matches = res.html.match(regex) || [];
  console.log('Matches found:', matches.length);
  matches.slice(0, 5).forEach((m, idx) => console.log(`${idx + 1}: ${m}`));
}

test().catch(console.error);
