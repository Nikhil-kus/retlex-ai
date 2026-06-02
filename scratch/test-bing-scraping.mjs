import https from 'https';

function searchBingImages(query) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const matches = [];
        const regex = /murl&quot;:&quot;(https:\/\/[^&]+)&quot;/g;
        let match;
        while ((match = regex.exec(data)) !== null) {
          matches.push(match[1]);
        }
        resolve(matches);
      });
    }).on('error', reject);
  });
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
  'blinkit.com',
  'grofers.com',
  'imimg.com',
  'dmart.in',
  'flipkart.com',
  'freshtohome.com'
];

const BLACKLIST_KEYWORDS = [
  'wallpaper', 'freepik', 'pinterest', 'slideshare', 'slideserve', 'vector',
  'researchgate', 'shutterstock', 'dreamstime', '123rf', 'stock', 'depositphotos',
  'facebook', 'instagram', 'twitter', 'youtube', 'yimg.com', 'zenfs.com', 'tse1.mm.bing.net'
];

function selectBestImage(urls) {
  // 1. Try to find a trusted domain match
  for (const url of urls) {
    if (TRUSTED_DOMAINS.some(domain => url.toLowerCase().includes(domain))) {
      return { url, source: 'trusted' };
    }
  }
  
  // 2. Try to find any direct image that is not blacklisted
  for (const url of urls) {
    const lower = url.toLowerCase();
    const isBlacklisted = BLACKLIST_KEYWORDS.some(kw => lower.includes(kw));
    const isDirectImage = lower.match(/\.(jpg|jpeg|png|webp)/);
    if (!isBlacklisted && isDirectImage) {
      return { url, source: 'non-blacklisted' };
    }
  }
  
  return null;
}

async function run() {
  const queries = [
    'Everest Tikhalal Red Chilli Powder 50g site:bigbasket.com OR site:amazon.in',
    'Everest Tikhalal',
    'Everest Tikhalal Chilli Powder',
    'Everest Tikhalal 50g'
  ];
  
  for (const query of queries) {
    console.log(`\n--------------------------------------------`);
    console.log(`Searching Bing Images for: "${query}"`);
    const urls = await searchBingImages(query);
    console.log(`Found ${urls.length} URLs.`);
    
    const trustedUrls = urls.filter(url => 
      TRUSTED_DOMAINS.some(domain => url.toLowerCase().includes(domain))
    );
    console.log(`Trusted URLs found: ${trustedUrls.length}`);
    trustedUrls.slice(0, 5).forEach((url, i) => console.log(`  Trusted ${i + 1}: ${url}`));
    
    const best = selectBestImage(urls);
    if (best) {
      console.log(`Best Selected Image: ${best.url} (Source Type: ${best.source})`);
    } else {
      console.log('No suitable image found.');
    }
  }
}

run().catch(console.error);
