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

// 1x1 pixel white JPEG image base64
const base64Data = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

const prompt = `You are a product recognition AI for an Indian kirana (grocery) store.
Analyze this product image and extract structured data.

Rules:
- Extract the actual product name from the packaging text (e.g. "Tata Salt", "Maggi Masala Noodles")
- If Hindi text is visible, include it in localName (e.g. "टाटा नमक", "मैगी")
- Choose the most appropriate category from: Grains & Cereals, Pulses & Dals, Spices & Seasonings, Oils & Ghee, Dairy & Milk Products, Beverages, Snacks & Confectionery, Instant Foods & Noodles, Personal Care & Hygiene, Household Cleaning, Miscellaneous
- Choose the most appropriate unit from: pc, kg, g, l, pkt
- If image is unclear, make your best guess based on what you can see
- NEVER return null values, always return strings`;

async function run() {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                localName: { type: 'STRING' },
                category: { type: 'STRING' },
                unit: { type: 'STRING' }
              },
              required: ['name', 'unit', 'category']
            }
          }
        })
      }
    );

    console.log('Status:', res.status, res.statusText);
    const data = await res.json();
    console.log('Response JSON:', JSON.stringify(data, null, 2));
    if (res.ok) {
      console.log('Text Content:', data.candidates?.[0]?.content?.parts?.[0]?.text);
    }
  } catch (err) {
    console.error('Error running fetch:', err);
  }
}

run();
