import https from 'https';

function searchBing(query, ua) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (ua) {
      headers['User-Agent'] = ua;
    }
    
    https.get(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const iuscCount = (data.match(/class="[^"]*iusc[^"]*"/g) || []).length;
        const imgTags = (data.match(/<img /g) || []).length;
        const murls = [];
        const regex = /murl&quot;:&quot;(https:\/\/[^&]+)&quot;/g;
        let match;
        while ((match = regex.exec(data)) !== null) {
          murls.push(match[1]);
        }
        resolve({ iuscCount, imgTags, murlsCount: murls.length, firstUrl: murls[0] || null });
      });
    }).on('error', reject);
  });
}

const UAs = {
  "None": null,
  "Googlebot": "Googlebot/2.1 (+http://www.google.com/bot.html)",
  "Mobile Android": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36",
  "Curl": "curl/7.88.1",
  "Mozilla Old": "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)"
};

async function run() {
  const query = 'Dettol Soap Cool 125g';
  for (const [name, ua] of Object.entries(UAs)) {
    console.log(`User-Agent: ${name}`);
    try {
      const res = await searchBing(query, ua);
      console.log(`  iusc elements: ${res.iuscCount}`);
      console.log(`  img tags: ${res.imgTags}`);
      console.log(`  murls count: ${res.murlsCount}`);
      console.log(`  First URL: ${res.firstUrl}`);
    } catch (e) {
      console.error(`  Error:`, e.message);
    }
  }
}

run().catch(console.error);
