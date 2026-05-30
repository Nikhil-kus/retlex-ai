import https from 'https';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        resolve({ redirectUrl: res.headers.location, statusCode: res.statusCode });
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ html: data, statusCode: res.statusCode }));
    }).on('error', reject);
  });
}

async function main() {
  const url = "https://basantbaharagarbatti.com/";
  let current = url;
  for (let i = 0; i < 5; i++) {
    console.log(`Resolving: ${current}`);
    const res = await fetchUrl(current);
    if (res.redirectUrl) {
      current = res.redirectUrl;
    } else {
      console.log(`Final URL: ${current}`);
      console.log(`Status Code: ${res.statusCode}`);
      if (res.html) {
        console.log("HTML length:", res.html.length);
        const imgRegex = /https?:\/\/[^"'\s>]+?\.(?:jpg|jpeg|png|webp)/gi;
        const matches = res.html.match(imgRegex) || [];
        console.log(`Found ${matches.length} image URLs on the page:`);
        const unique = [...new Set(matches)];
        unique.forEach(img => {
          console.log(`  📸 Candidate: ${img}`);
        });
      }
      break;
    }
  }
}

main().catch(console.error);
