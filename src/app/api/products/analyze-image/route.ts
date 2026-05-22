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

Rules:
- Extract the actual product name from the packaging text (e.g. "Tata Salt", "Maggi Masala Noodles")
- If Hindi text is visible, include it in localName (e.g. "टाटा नमक", "मैगी")
- Choose the most appropriate category from: Grains & Cereals, Pulses & Dals, Spices & Seasonings, Oils & Ghee, Dairy & Milk Products, Beverages, Snacks & Confectionery, Instant Foods & Noodles, Personal Care & Hygiene, Household Cleaning, Miscellaneous
- Choose the most appropriate unit from: pc, kg, g, l, pkt
- If image is unclear, make your best guess based on what you can see
- NEVER return null values, always return strings`;

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

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Gemini error: ${err.slice(0, 200)}` }, { status: 500 });
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 });

    // Parse JSON — handle markdown code blocks if returned, else parse direct
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
    const parsed = JSON.parse(jsonStr.trim());

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
