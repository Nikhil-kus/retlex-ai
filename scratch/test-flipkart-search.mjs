import https from 'https';

const query = encodeURIComponent("Pepsodent Toothpaste 50g");
const url = `https://www.flipkart.com/search?q=${query}&otracker=search`;

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const titleMatch = data.match(/<title[^>]*>([^<]+)<\/title>/i);
    console.log("Title:", titleMatch ? titleMatch[1] : "No title");
    
    const matches = [...data.matchAll(/(https:\/\/rukminim[^"'\s]+\.(?:jpg|jpeg|png|webp))/gi)];
    console.log(`Found ${matches.length} image URLs`);
    
    // Filter out standard Flipkart logos and icons
    const filtered = matches.filter(m => {
        const u = m[1];
        return !u.includes('/www/') && !u.includes('logo') && !u.includes('icon') && !u.includes('fk-p-registry');
    });
    
    console.log(`Found ${filtered.length} NON-LOGO image URLs`);
    if (filtered.length > 0) {
      console.log(filtered.slice(0, 5).map(m => m[1]));
    }
  });
}).on('error', (e) => {
  console.error(e);
});
