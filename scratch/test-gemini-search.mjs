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

console.log('Using API Key:', apiKey ? apiKey.slice(0, 8) + '...' : 'undefined');

async function testGeminiSearch(productName) {
  const prompt = `Search for the product: "${productName}". 
We need a high-quality product image or product page from bigbasket.com, blinkit.com, jiomart.com, or amazon.in.
Return a JSON containing:
- url: a valid URL (prefer direct image URL ending in .jpg/.png, but a product page URL is also acceptable)
- type: either "image" or "page" depending on what you found
- domain: the domain name (e.g. "bigbasket.com")`;

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
            temperature: 0.2,
            maxOutputTokens: 512
          }
        })
      }
    );

    const data = await res.json();
    console.log(`\nProduct: ${productName}`);
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      const text = data.candidates[0].content.parts[0].text;
      console.log('Text content:', text);
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/{[\s\S]*}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          console.log('Parsed JSON:', parsed);
        } catch (e) {
          console.log('Could not parse extracted text as JSON:', e.message);
        }
      }
    } else {
      console.log('Response JSON (Error or empty):', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Error running search:', err);
  }
}

async function main() {
  await testGeminiSearch('Dettol Soap Cool 125g');
  await testGeminiSearch('Catch Raita Masala 50g');
}

main().catch(console.error);
