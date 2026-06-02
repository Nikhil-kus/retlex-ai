import https from 'https';

function searchYahooImages(query) {
  return new Promise((resolve, reject) => {
    https.get(`https://images.search.yahoo.com/search/images?p=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Yahoo images page stores images in a JSON object inside <li class="ld" ... data-src="...">
        // or inside <li class="ld" ...> and we can extract URLs by parsing metadata.
        // Let's find all occurrences of "murl":"..." or "iurl":"..." or look for URLs in the text
        const matches = [];
        // Yahoo metadata is often in JSON format inside the HTML, e.g. {"ou":"...", "ou":"http..."}
        // Let's find any URL that looks like an image from a trusted domain or generally
        const regex = /"ou":"(https:\/\/[^"]+)"/g;
        let match;
        while ((match = regex.exec(data)) !== null) {
          matches.push(match[1]);
        }
        
        // Let's also look for general "http... .jpg/.png" patterns if "ou" isn't found
        if (matches.length === 0) {
          const imgRegex = /"https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)"/g;
          while ((match = imgRegex.exec(data)) !== null) {
            matches.push(match[0].replace(/"/g, ''));
          }
        }
        resolve({ count: data.length, urls: matches });
      });
    }).on('error', reject);
  });
}

async function test() {
  const query = 'Dettol Soap Cool 125g site:bigbasket.com OR site:amazon.in';
  console.log(`Searching Yahoo Images for: "${query}"`);
  const result = await searchYahooImages(query);
  console.log(`HTML Length: ${result.count}`);
  console.log(`Found ${result.urls.length} URLs:`);
  result.urls.slice(0, 15).forEach((url, i) => {
    console.log(`${i + 1}: ${url}`);
  });
}

test().catch(console.error);
