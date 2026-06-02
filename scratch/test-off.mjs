import https from 'https';

function searchOpenFoodFacts(query) {
  return new Promise((resolve, reject) => {
    // Search India-specific open food facts
    const url = `https://in.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1`;
    https.get(url, {
      headers: {
        'User-Agent': 'RetlexKiranaApp/1.0 (nikhil@retlex.ai)'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.products || []);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', reject);
  });
}

async function test() {
  const query = 'Everest Chicken Masala';
  console.log(`Searching Open Food Facts for: "${query}"`);
  const products = await searchOpenFoodFacts(query);
  console.log(`Found ${products.length} products:`);
  products.slice(0, 5).forEach((p, idx) => {
    console.log(`${idx + 1}. Name: ${p.product_name || p.product_name_en}`);
    console.log(`   Image URL: ${p.image_front_url || p.image_url || 'NONE'}`);
    console.log(`   Barcode: ${p.code}`);
  });
}

test().catch(console.error);
