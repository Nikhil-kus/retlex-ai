import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const apiKey = process.env.GEMINI_API_KEY;
console.log('Using API Key:', apiKey ? apiKey.slice(0, 8) + '...' : 'undefined');

const prompt = 'Return a JSON containing name, localName, category, and unit for a product named Tata Salt.';

async function run() {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256,
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
  } catch (err) {
    console.error('Error running fetch:', err);
  }
}

run();
