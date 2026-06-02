import https from 'https';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, html: data });
      });
    }).on('error', reject);
  });
}

const targetUrl = 'https://www.bigbasket.com/pd/270770/dettol-germ-protection-bathing-bar-soap-cool-125-g/';

fetchPage(targetUrl)
  .then(res => {
    console.log('Status:', res.status);
    console.log('HTML Length:', res.html.length);
    
    // Look for image URLs in the page
    const imgUrls = [];
    const regex = /"https:\/\/[^"]+?bigbasket.com\/media\/uploads\/p\/[^"]+?"/g;
    let match;
    while ((match = regex.exec(res.html)) !== null) {
      imgUrls.push(match[0]);
    }
    
    console.log(`Found ${imgUrls.length} BigBasket media URLs:`);
    imgUrls.slice(0, 10).forEach((url, i) => {
      console.log(`${i + 1}: ${url}`);
    });
  })
  .catch(console.error);
