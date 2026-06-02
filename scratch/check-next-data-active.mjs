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
        resolve(data);
      });
    }).on('error', reject);
  });
}

async function test() {
  const url = 'https://www.bigbasket.com/pd/20000392/everest-tikhalal-chilli-powder-50-g/';
  console.log('Fetching:', url);
  const html = await fetchUrl(url);
  
  const regex = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/gi;
  const match = regex.exec(html);
  if (match) {
    const data = JSON.parse(match[1]);
    console.log('Parsed successfully!');
    console.log('Product Details error state:', data.props?.pageProps?.productDetails?.errors);
    console.log('Product Details data:', JSON.stringify(data.props?.pageProps?.productDetails?.data, null, 2));
  } else {
    console.log('__NEXT_DATA__ script not found!');
  }
}

test().catch(console.error);
