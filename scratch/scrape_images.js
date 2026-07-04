const puppeteer = require('puppeteer');

const queries = {
  'Patanjali': 'Patanjali Kesh Kanti Natural Hair Cleanser shampoo bottle transparent png',
  'Tobacco': 'Kamal kishore tambaku packet'
};

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');

  for (const [cat, query] of Object.entries(queries)) {
    try {
      await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&t=h_&iax=images&ia=images`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('.tile--img__img', { timeout: 5000 });
      
      const src = await page.evaluate(() => {
        const img = document.querySelector('.tile--img__img');
        return img ? img.src : null;
      });

      console.log(`'${cat}': '${src}',`);
    } catch (e) {
      console.log(`'${cat}': '', // Failed`);
    }
  }

  await browser.close();
})();
