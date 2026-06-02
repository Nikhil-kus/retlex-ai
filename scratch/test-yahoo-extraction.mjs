import https from 'https';

function searchYahooWeb(query) {
  return new Promise((resolve, reject) => {
    https.get(`https://search.yahoo.com/search?p=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', reject);
  });
}

function extractNestedUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    const params = ['imgurl', 'mediaurl', 'ru', 'url', 'rurl', 'ou'];
    for (const p of params) {
      const val = url.searchParams.get(p);
      if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
        return val;
      }
    }
  } catch (e) {
    const nestedRegex = /(?:imgurl|mediaurl|ru|url|rurl|ou)=(https?%3A%2F%2F[^&"'\s>]+)/i;
    const match = urlStr.match(nestedRegex);
    if (match) {
      try {
        return decodeURIComponent(match[1]);
      } catch (err) {}
    }
  }
  return urlStr;
}

const TRUSTED_DOMAINS = [
  'bbassets.com',
  'bigbasket.com',
  'media-amazon.com',
  'ssl-images-amazon.com',
  'amazon.in',
  'amazon.com',
  'jiomart.com',
  'cdn.fynd.com',
  'jiomartjcp.com',
  'blinkit.com',
  'grofers.com',
  'imimg.com',
  'dmart.in',
  'flipkart.com'
];

function selectBestImage(urls) {
  for (const url of urls) {
    const lower = url.toLowerCase();
    
    // Check BigBasket
    if (lower.includes('bbassets.com') || lower.includes('bigbasket.com')) {
      return { url, source: 'bigbasket' };
    }
    
    // Check JioMart
    if (lower.includes('jiomart.com') || lower.includes('cdn.fynd.com') || lower.includes('jiomartjcp.com')) {
      return { url, source: 'jiomart' };
    }
    
    // Check Amazon (must be Item image '/images/I/')
    if ((lower.includes('amazon.in') || lower.includes('media-amazon.com') || lower.includes('images-amazon.com')) && lower.includes('/images/i/')) {
      return { url, source: 'amazon' };
    }
    
    // Check Blinkit
    if (lower.includes('blinkit.com') || lower.includes('grofers.com')) {
      return { url, source: 'blinkit' };
    }
    
    // Check Indiamart
    if (lower.includes('imimg.com')) {
      return { url, source: 'indiamart' };
    }
  }
  return null;
}

function extractImagesFromYahooHtml(html) {
  const urls = [];
  const cleanHtml = html.replaceAll('\\/', '/').replaceAll('\\u002F', '/');
  
  // Extract patterns like imgurl=... or ou=... and decode them safely
  const regex = /(?:imgurl|ou)=([^&"'\s>]+)/g;
  let match;
  while ((match = regex.exec(cleanHtml)) !== null) {
    try {
      const decoded = decodeURIComponent(match[1]);
      if (decoded.startsWith('http')) {
        urls.push(extractNestedUrl(decoded));
      }
    } catch (e) {
      // Ignore decoding errors
    }
  }
  
  // General HTTP URLs regex
  const urlRegex = /https?:\/\/[^"'\s>&]+/g;
  let urlMatch;
  while ((urlMatch = urlRegex.exec(cleanHtml)) !== null) {
    try {
      const decoded = decodeURIComponent(urlMatch[0]);
      urls.push(extractNestedUrl(decoded));
    } catch (e) {
      urls.push(extractNestedUrl(urlMatch[0]));
    }
  }
  
  return [...new Set(urls)];
}

async function test() {
  const query = 'Everest Pav Bhaji Masala 50g';
  console.log(`Searching Yahoo Web for: "${query}"`);
  const html = await searchYahooWeb(query);
  const urls = extractImagesFromYahooHtml(html);
  console.log(`Found ${urls.length} raw URLs.`);
  
  const best = selectBestImage(urls);
  console.log('\nBest Image selected:', best);
}

test().catch(console.error);
