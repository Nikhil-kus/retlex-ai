import http from 'http';
import https from 'https';

const url = "https://www.bigbasket.com/media/uploads/p/l/266945_16-horlicks-health-nutrition-drink-classic-malt.jpg";

https.get(url, { headers: { 'Referer': 'http://localhost:3000' } }, (res) => {
  console.log(`With Referer localhost:3000 -> Status: ${res.statusCode}`);
});

https.get(url, (res) => {
  console.log(`Without Referer -> Status: ${res.statusCode}`);
});
