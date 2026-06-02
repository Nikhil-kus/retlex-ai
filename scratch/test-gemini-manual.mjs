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

async function testResponseSchema() {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: 'Return a JSON containing name, localName, category, and unit for Tata Salt.' }]
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
    if (res.ok) {
      console.log('Text Content:', data.candidates?.[0]?.content?.parts?.[0]?.text);
    }
  } catch (err) {
    console.error('Exception:', err.message);
  }
}

testResponseSchema();
