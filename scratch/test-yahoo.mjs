import https from 'https';

const query = encodeURIComponent("Horlicks 500g product india");
const url = `https://images.search.yahoo.com/search/images?p=${query}`;

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Yahoo image search stores images in data-src or src inside img tags, often inside anchor tags or json
    // let's look for .jpg
    const matches = [...data.matchAll(/(https?:\/\/[^\s"'<>]+\.jpg)/gi)];
    console.log(`Status: ${res.statusCode}`);
    console.log(`Found ${matches.length} jpg URLs`);
    if (matches.length > 0) {
      console.log(matches.slice(0, 5).map(m => m[1]));
    }
  });
}).on('error', (e) => {
  console.error(e);
});
