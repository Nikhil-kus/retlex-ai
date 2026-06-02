import https from 'https';
import fs from 'fs';

function saveBingHtml(query) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        fs.writeFileSync('scratch/bing_output.html', data);
        resolve(data.length);
      });
    }).on('error', reject);
  });
}

saveBingHtml('Dettol Soap Cool 125g India')
  .then(len => console.log(`Saved HTML. Length: ${len} bytes`))
  .catch(console.error);
