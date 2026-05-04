import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { imageBase64 } = await request.json();
    if (!imageBase64) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });

    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `You are a product recognition AI for an Indian kirana (grocery) store.
Analyze this product image and extract structured data.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "name": "product name in English",
  "localName": "Hindi name if visible on packaging, else empty string",
  "category": "one of: Grains & Cereals, Dairy & Milk Products, Beverages, Snacks, Spices & Masala, Personal Care, Household Cleaning, Instant Foods, Oils & Ghee, Confectionery, Tobacco, Miscellaneous",
  "unit": "one of: pc, kg, g, l, pkt"
}

Rules:
- Extract the actual product name from the packaging text
- If Hindi text is visible, include it in localName
- Choose the most appropriate category
- unit should reflect how this product is typically sold (pkt for packets, kg for loose grains, l for liquids, pc for single items)
- If image is unclear, make your best guess based on what you can see
- NEVER return null values, always return strings`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: base64Data } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 256 }
        })
      }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Gemini error: ${err.slice(0, 200)}` }, { status: 500 });
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 });

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      name: parsed.name || '',
      localName: parsed.localName || '',
      category: parsed.category || '',
      unit: parsed.unit || 'pc',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
  }
}
