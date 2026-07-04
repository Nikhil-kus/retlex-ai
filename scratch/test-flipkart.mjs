import https from 'https';

const query = encodeURIComponent("Horlicks 500g");
const url = `https://www.flipkart.com/search?q=${query}&otracker=search`;

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const matches = [...data.matchAll(/(https:\/\/rukminim[^"'\s]+\.(?:jpg|jpeg|png|webp))/gi)];
    console.log(`Status: ${res.statusCode}`);
    console.log(`Found ${matches.length} image URLs`);
    if (matches.length > 0) {
      console.log(matches.slice(0, 5).map(m => m[1]));
    }
  });
}).on('error', (e) => {
  console.error(e);
});
