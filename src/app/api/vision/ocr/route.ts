import Fuse from 'fuse.js';
import { NextResponse } from 'next/server';
import { collection, getDocs, getDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: Request) {
  try {
    const { imageBase64, shopId } = await request.json();
    if (!imageBase64 || !shopId) return NextResponse.json({ error: 'Missing image or shopId' }, { status: 400 });

    const shopDoc = await getDoc(doc(db, "shops", shopId));
    const shop = shopDoc.exists() ? { id: shopDoc.id, ...shopDoc.data() } : null;

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY is not defined in the environment.");
      return NextResponse.json({ error: 'Missing AI configuration' }, { status: 500 });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    // Fetch catalog early to construct AI prompt
    const q = query(collection(db, "products"), where("shopId", "==", shopId));
    const querySnapshot = await getDocs(q);
    const catalog = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const catalogNames = catalog.map((c: any) => c.name);

    // STRICT PROMPT provided by the user
    const prompt = `You are a retail assistant.

Here is my shop product catalog:
${JSON.stringify(catalogNames)}

Now analyze this image and match items to the closest product.

Rules:
- Fix spelling mistakes
- Map to closest catalog item


Return JSON:
[
 { "name": "<catalog name>", "quantity": number, "unit": "" }
]`;

    let geminiItems: { name: string, quantity: number, unit: string }[] = [];
    try {
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: cleanBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  quantity: { type: "NUMBER" },
                  unit: { type: "STRING" }
                },
                required: ["name", "quantity", "unit"]
              }
            }
          }
        })
      });

      const geminiData = await geminiResponse.json();

      if (!geminiResponse.ok) {
        console.error("Gemini API Error:", JSON.stringify(geminiData, null, 2));
        return NextResponse.json({ error: `Gemini API returned ${geminiResponse.status}: ${geminiData.error?.message || 'Unknown error'}` }, { status: 500 });
      }

      if (geminiData.candidates && geminiData.candidates.length > 0) {
        geminiItems = JSON.parse(geminiData.candidates[0].content.parts[0].text);
      } else {
        console.warn("Gemini empty candidates:", JSON.stringify(geminiData, null, 2));
      }
    } catch (e: any) {
      console.error("Failed to fetch or parse from Gemini API:", e.message || e);
      return NextResponse.json({ error: e.message || 'Failed to extract items from image' }, { status: 500 });
    }

    // MANDATORY VALIDATION LAYER
    const validGeminiItems = geminiItems.filter(item => {
      if (!item.name || String(item.name).trim() === '') return false;
      const numQty = Number(item.quantity);
      if (isNaN(numQty) || numQty <= 0) return false;
      return true;
    }).map(item => {
      let q = Number(item.quantity) || 1;
      let u = item.unit;
      if (!u || String(u).trim() === '') u = 'pc';

      return {
        name: item.name.trim().toLowerCase(),
        quantity: q,
        unit: u.trim().toLowerCase()
      };
    });

    if (validGeminiItems.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Catalog was already fetched above.

    // Fuse.js setup
    const fuse = new Fuse(catalog, {
      keys: ['name', 'localName'],
      threshold: 0.45,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2
    });

    const rawMatchedItems = validGeminiItems.map(item => {
      // Clean up formatting on Gemini strings before searching
      const searchName = item.name.replace(/\d+/g, '').replace(/\b(kg|g|ml|l|ltr|pcs?|pieces?|pkt|pack|packet|day|meter|m)\b/gi, '').trim();

      const result = fuse.search(searchName);
      let bestMatch: any = null;
      let bestScore = 1;

      if (result.length && (result[0].score ?? 1) <= 0.45) {
        bestScore = result[0].score ?? 1;
        bestMatch = result[0].item;
      }

      // Secondary fallback sequence
      if (!bestMatch) {
        const words = searchName.split(' ').filter(w => w.length > 2);
        for (const word of words) {
          const wordResult = fuse.search(word);
          if (wordResult.length) {
            const score = wordResult[0].score ?? 1;
            if (score < bestScore && score < 0.25) { // Stricter match
              bestScore = score;
              bestMatch = wordResult[0].item;
            }
          }
        }
      }

      // CONFIDENCE THRESHOLD (drop if no match under threshold)
      if (!bestMatch) {
        return {
          productId: null,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          price: 0,
          costPrice: 0,
          confidence: 'low',
          hasExplicitQty: true,
          aiLabel: item.name
        };
      }

      const match = bestMatch;

      // 1. Unit Normalization
      let normalizedUnit = String(item.unit || '').toLowerCase();
      if (['g', 'gm', 'grams', 'gram'].includes(normalizedUnit)) normalizedUnit = 'g';
      else if (['kg', 'kilo', 'kilos'].includes(normalizedUnit)) normalizedUnit = 'kg';
      else if (['litre', 'litres', 'l', 'ltr'].includes(normalizedUnit)) normalizedUnit = 'l';
      else if (['packet', 'pack', 'pkt', 'pc', 'pcs', 'piece'].includes(normalizedUnit)) normalizedUnit = 'pc';

      // 2. Conversion Logic
      let finalQty = item.quantity;
      const baseUnit = match.baseUnit || 'pc';

      if (normalizedUnit === 'g' && baseUnit === 'kg') {
        finalQty = finalQty / 1000;
      } else if (normalizedUnit === 'g' && baseUnit === 'g') {
        finalQty = finalQty / (match.baseQuantity || 1);
      } else if (normalizedUnit === 'ml' && baseUnit === 'l') {
        finalQty = finalQty / 1000;
      } else if (normalizedUnit === 'ml' && baseUnit === 'ml') {
        finalQty = finalQty / (match.baseQuantity || 1);
      }

      return {
        productId: match.id,
        name: match.name,
        quantity: finalQty,
        unit: baseUnit,
        baseUnit: match.baseUnit,
        baseQuantity: match.baseQuantity,
        price: match.price,
        costPrice: match.costPrice,
        confidence: 'high',
        hasExplicitQty: true,
        aiLabel: item.name
      };
    }).filter(Boolean) as any[];

    // 3. Flag duplicates instead of merging
    const seenItemsMap = new Set();
    const finalItems = rawMatchedItems.map((item: any) => {
      const key = (item.productId || item.name).toLowerCase();
      let isRepeated = false;
      
      if (seenItemsMap.has(key)) {
        isRepeated = true;
      } else {
        seenItemsMap.add(key);
      }
      
      const { hasExplicitQty, ...rest } = item;
      return { ...rest, isRepeated };
    });

    return NextResponse.json({ items: finalItems });

  } catch (error) {
    console.error('OCR Error:', error);
    return NextResponse.json({ error: 'Failed to process OCR' }, { status: 500 });
  }
}
