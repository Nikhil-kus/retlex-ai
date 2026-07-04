import https from 'https';

const url = "https://m.media-amazon.com/images/I/61r5T0v2N9L._SL1500_.jpg";

https.get(url, { headers: { 'User-Agent': 'node-fetch/1.0' } }, (res) => {
  console.log(`With Node fetch User-Agent -> Status: ${res.statusCode}`);
});

https.get(url, { headers: { 'Referer': 'http://localhost:3000' } }, (res) => {
  console.log(`With localhost Referer -> Status: ${res.statusCode}`);
});
