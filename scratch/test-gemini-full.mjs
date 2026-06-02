import fs from 'fs';
import path from 'path';

// Parse .env manually
const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
let apiKey = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('GEMINI_API_KEY=')) {
    apiKey = line.split('=')[1].replace(/['"\r]/g, '').trim();
  }
}

async function testGeminiSearch(productName) {
  const prompt = `Search for the product: "${productName}".
Find the product page URLs on bigbasket.com, jiomart.com, blinkit.com, and amazon.in.
List the store names and their respective product page URLs. For example:
- BigBasket: https://www.bigbasket.com/pd/123/product
- JioMart: https://www.jiomart.com/p/groceries/product/123
- Amazon: https://www.amazon.in/dp/123
- Blinkit: https://blinkit.com/prn/product/id/123
Output the actual URLs. Output nothing else.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: prompt }]
          }],
          tools: [{
            google_search: {}
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const data = await res.json();
    console.log(`\nProduct: ${productName}`);
    console.log('Raw Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error running search:', err);
  }
}

async function main() {
  await testGeminiSearch('Everest Tikhalal Red Chilli Powder 50g');
}

main().catch(console.error);
