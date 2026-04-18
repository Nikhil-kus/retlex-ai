import Fuse from 'fuse.js';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { imageBase64, shopId } = await request.json();
    if (!imageBase64 || !shopId) return NextResponse.json({ error: 'Missing image or shopId' }, { status: 400 });

    const shop = await prisma.shop.findUnique({
      where: { id: shopId }
    });

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY is not defined in the environment.");
      return NextResponse.json({ error: 'Missing AI configuration' }, { status: 500 });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    // Fetch catalog early to construct AI prompt
    const catalog = await prisma.product.findMany({ where: { shopId } });
    const catalogNames = catalog.map(c => c.name);

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

    // Fuse.js setup before streaming
    const fuse = new Fuse(catalog, {
       keys: ['name', 'localName'],
       threshold: 0.45,
       includeScore: true,
       ignoreLocation: true,
       minMatchCharLength: 2
    });

    const seenItemsMap = new Set();
    const processAndMatchItem = (rawItem: any) => {
       let itemName = String(rawItem.name || '').trim();
       let qty = Number(rawItem.quantity) || 1;
       let unit = String(rawItem.unit || 'pc').trim().toLowerCase();

       const searchName = itemName.replace(/\d+/g, '').replace(/\b(kg|g|ml|l|ltr|pcs?|pieces?|pkt|pack|packet|day|meter|m)\b/gi, '').trim();
       const result = fuse.search(searchName);
       let bestMatch: any = null;
       let bestScore = 1;

       if (result.length && (result[0].score ?? 1) <= 0.45) {
          bestScore = result[0].score ?? 1;
          bestMatch = result[0].item;
       }

       if (!bestMatch) {
          const words = searchName.split(' ').filter(w => w.length > 2);
          for (const word of words) {
             const wordResult = fuse.search(word);
             if (wordResult.length) {
                const score = wordResult[0].score ?? 1;
                if (score < bestScore && score < 0.25) {
                   bestScore = score;
                   bestMatch = wordResult[0].item;
                }
             }
          }
       }

       let finalMatched = null;
       if (!bestMatch) {
          finalMatched = {
             productId: null,
             name: itemName,
             quantity: qty,
             unit: unit,
             price: 0,
             costPrice: 0,
             confidence: 'low',
             aiLabel: itemName
          };
       } else {
          const match = bestMatch;
          let normalizedUnit = unit;
          if (['g', 'gm', 'grams', 'gram'].includes(normalizedUnit)) normalizedUnit = 'g';
          else if (['kg', 'kilo', 'kilos'].includes(normalizedUnit)) normalizedUnit = 'kg';
          else if (['litre', 'litres', 'l', 'ltr'].includes(normalizedUnit)) normalizedUnit = 'l';
          else if (['packet', 'pack', 'pkt', 'pc', 'pcs', 'piece'].includes(normalizedUnit)) normalizedUnit = 'pc';

          let finalQty = qty;
          const baseUnit = match.baseUnit || 'pc';

          if (normalizedUnit === 'g' && baseUnit === 'kg') finalQty = finalQty / 1000;
          else if (normalizedUnit === 'g' && baseUnit === 'g') finalQty = finalQty / (match.baseQuantity || 1);
          else if (normalizedUnit === 'ml' && baseUnit === 'l') finalQty = finalQty / 1000;
          else if (normalizedUnit === 'ml' && baseUnit === 'ml') finalQty = finalQty / (match.baseQuantity || 1);

          finalMatched = {
             productId: match.id,
             name: match.name,
             quantity: finalQty,
             unit: baseUnit,
             baseUnit: match.baseUnit,
             baseQuantity: match.baseQuantity,
             price: match.price,
             costPrice: match.costPrice,
             confidence: 'high',
             aiLabel: itemName
          };
       }

       const key = `${finalMatched.productId || finalMatched.name}_${finalMatched.quantity}`.toLowerCase();
       if (seenItemsMap.has(key)) {
          return null; // Ignore duplicate item completely!
       }
       seenItemsMap.add(key);

       return { ...finalMatched, isRepeated: false };
    };

    const geminiPayload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } }
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
    };

    const stream = new ReadableStream({
       async start(controller) {
          const encoder = new TextEncoder();
          
          try {
             const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${geminiApiKey}`, {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(geminiPayload)
             });

             if (!geminiResponse.ok || !geminiResponse.body) {
                console.error("Gemini failed");
                controller.close();
                return;
             }

             const reader = geminiResponse.body.getReader();
             const decoder = new TextDecoder("utf-8");
             let buffer = "";
             let jsonTextContent = "";

             while (true) {
                let readResult;
                let frontendTimer: any;
                try {
                   // TIMEOUT PROTECTION (extended to 90s for dense AI payload lags)
                   const timeoutPromise = new Promise((_, reject) => {
                       frontendTimer = setTimeout(() => reject(new Error("Stream timeout")), 90000);
                   });
                   readResult = await Promise.race([ reader.read(), timeoutPromise ]);
                   clearTimeout(frontendTimer);
                } catch (timeoutErr) {
                   if (frontendTimer) clearTimeout(frontendTimer);
                   console.log("Stream chunks timed out, safely breaking");
                   break;
                }
                
                const { done, value } = readResult as any;
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                
                let boundary = buffer.indexOf('\n\n');
                while (boundary !== -1) {
                   const message = buffer.slice(0, boundary);
                   buffer = buffer.slice(boundary + 2);
                   
                   if (message.startsWith('data: ')) {
                      const dataStr = message.slice(6);
                      if (dataStr !== '[DONE]') {
                         try {
                            const dataObj = JSON.parse(dataStr);
                            const textPart = dataObj.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (textPart) {
                               jsonTextContent += textPart;
                               
                               while (true) {
                                  const startIdx = jsonTextContent.indexOf('{');
                                  if (startIdx === -1) break;
                                  const endIdx = jsonTextContent.indexOf('}', startIdx);
                                  if (endIdx === -1) break;
                                  
                                  const possibleJson = jsonTextContent.slice(startIdx, endIdx + 1);
                                  try {
                                     const rawItem = JSON.parse(possibleJson);
                                     jsonTextContent = jsonTextContent.slice(endIdx + 1);
                                     
                                     if (rawItem.name && String(rawItem.name).trim() !== "") {
                                        const finalMatch = processAndMatchItem(rawItem);
                                        if (finalMatch) {
                                           controller.enqueue(encoder.encode(JSON.stringify({ item: finalMatch }) + '\n'));
                                        }
                                     }
                                  } catch (e) {
                                     // If we found '}' but it was malformed, forcefully advance buffer past '{' to break deadlock
                                     jsonTextContent = jsonTextContent.slice(startIdx + 1);
                                  }
                               }
                            }
                         } catch (e) {
                             // Ignore broken chunks silently without crashing stream
                         }
                      }
                   }
                   boundary = buffer.indexOf('\n\n');
                }
             }

             // FALLBACK HANDLING: If stream closed abruptly but buffer has `{`
             if (jsonTextContent.includes('{') && jsonTextContent.includes('}')) {
                 try {
                     const startIdx = jsonTextContent.lastIndexOf('{');
                     const endIdx = jsonTextContent.lastIndexOf('}');
                     if (startIdx < endIdx) {
                        const leftoverJson = JSON.parse(jsonTextContent.slice(startIdx, endIdx + 1));
                        const leftoverMatch = processAndMatchItem(leftoverJson);
                        if (leftoverMatch) {
                            controller.enqueue(encoder.encode(JSON.stringify({ item: leftoverMatch }) + '\n'));
                        }
                     }
                 } catch(e) {}
             }
             
             controller.close();
          } catch (e) {
             console.error('Stream error:', e);
             controller.error(e);
          }
       }
    });

    return new Response(stream, {
       headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
       }
    });

  } catch (error) {
    console.error('OCR Error:', error);
    return NextResponse.json({ error: 'Failed to process OCR' }, { status: 500 });
  }
}
