import fs from 'fs';
import path from 'path';

// Parse .env manually to get GEMINI_API_KEY
const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
let apiKey = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('GEMINI_API_KEY=')) {
    apiKey = line.split('=')[1].replace(/['"\r]/g, '').trim();
  }
}

if (!apiKey) {
  console.error("❌ GEMINI_API_KEY not found in .env file.");
  process.exit(1);
}

async function getDirectImageUrlWithGemini(productName) {
  const prompt = `Find a direct, high-quality product packaging image URL (ending in .jpg, .jpeg, .png, or .webp) for the product "${productName}" from online grocery stores like BigBasket, JioMart, Amazon India, Blinkit, or Zepto.
Do NOT output generic search pages or landing pages. The URL must point to a direct image file.
Output ONLY the raw image URL string, with no markdown, no quotes, and no other text. If you cannot find a direct image URL, output "NONE".`;

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
            maxOutputTokens: 1024
          }
        })
      }
    );

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'NONE';
    return text;
  } catch (e) {
    console.error(`  ⚠️ Gemini API failed:`, e.message);
    return 'NONE';
  }
}

async function main() {
  const products = [
    "Pure Shringar Bambooless Agarbatti",
    "Pushp Dhaniya Powder 200g",
    "Moong Dal Khula",
    "HMT Rice Kolam 1kg"
  ];

  for (const p of products) {
    console.log(`\n🔎 Querying Gemini for: "${p}"`);
    const imgUrl = await getDirectImageUrlWithGemini(p);
    console.log(`💡 Gemini returned: ${imgUrl}`);
  }
}

main().catch(console.error);
