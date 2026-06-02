const https = require('https');

function searchImage(query) {
  return new Promise((resolve, reject) => {
    https.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Find the first image that looks like an external image
        const regex = /<img[^>]+src="([^"]+)"[^>]*>/g;
        let match;
        const images = [];
        while ((match = regex.exec(data)) !== null) {
          images.push(match[1]);
        }
        resolve(images);
      });
    }).on('error', reject);
  });
}

searchImage('Aashirvaad Atta 5kg').then(console.log).catch(console.error);
