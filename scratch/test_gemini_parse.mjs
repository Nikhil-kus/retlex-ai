import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
let geminiKey = '';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    if (line.trim().startsWith('GEMINI_API_KEY=')) {
      geminiKey = line.split('=')[1].replace(/['"\r]/g, '').trim();
    }
  }
}

async function test() {
  const name = "Brazil Nut Packet 100g";
  const localName = "त्रिकोणफल पैकेट 100g";

  const prompt = `You are an expert system for Indian Kirana (grocery) stores.
Given a product's English name and its Hindi local name, generate a list of local Hindi name aliases, spelling variations, and common short names that customers might use when speaking or searching for this product in Hindi or Hinglish.

Guidelines:
1. Include common short names (e.g., brand + category: "लक्स साबुन" for "लक्स सॉफ्ट ग्लो साबुन", "कोलгель टूथपेस्ट" for "कोलगेट स्ट्रॉन्ग टीथ टूथपेस्ट").
2. Include spelling/pronunciation variations (e.g., "लॉन्ग", "लांग", "लौंग" for "Laung Khula", "नवरतन तेल" for "नवरत्न हेयर ऑयल").
3. Include local/regional descriptions (e.g. "कपड़ा साबुन" or "निरमा साबुन" for "निरमा डिटर्जेंट बार").
4. Keep the list concise and highly relevant (between 2 to 6 aliases).

Product English Name: "${name}"
Product Hindi Name: "${localName || ''}"`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              aliases: {
                type: 'ARRAY',
                items: { type: 'STRING' }
              }
            },
            required: ['aliases']
          }
        }
      })
    }
  );

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log("Full response data:", JSON.stringify(data, null, 2));
  
  try {
    const parsed = JSON.parse(text.trim());
    console.log("Parsed aliases:", parsed.aliases);
  } catch (e) {
    console.error("Parse error:", e);
  }
}

test().catch(console.error);
