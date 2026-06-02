const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeImages() {
  const content = fs.readFileSync('../src/lib/kirana-catalog.ts', 'utf8');
  const products = [...content.matchAll(/name:\s*"([^"]+)"/g)].map(m => m[1]);
  
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const results = {};
  for (const product of products) {
    try {
      const query = product + " grocery product india -site:pinterest.com";
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=isch`, { waitUntil: 'domcontentloaded' });
      
      // Extract the first non-icon image
      const img = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img.rg_i, img.YQ4gaf'));
        for (let i = 0; i < imgs.length; i++) {
          const src = imgs[i].src || imgs[i].getAttribute('data-src');
          if (src && src.length > 50) return src; // Return data URI or real URL
        }
        return null;
      });
      console.log(`${product}: ${img ? img.substring(0, 30) + '...' : 'null'}`);
      results[product] = img;
      
      // Wait a bit to avoid rate limits
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error(`Failed ${product}:`, e.message);
    }
  }
  
  fs.writeFileSync('images.json', JSON.stringify(results, null, 2));
  await browser.close();
  console.log("Done");
}

scrapeImages().catch(console.error);
