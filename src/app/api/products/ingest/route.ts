/**
 * POST /api/products/ingest
 * ─────────────────────────────────────────────────────────────────────────────
 * AI-assisted product ingestion from shelf/product images.
 *
 * Flow:
 *   1. Receive base64 image + shopId
 *   2. Send to Gemini Vision → detect product names, brands, variants
 *   3. For each detected product:
 *      a. Check globalCatalog for existing match (Fuse.js)
 *      b. If found → reuse metadata + image
 *      c. If not found → try Open Food Facts for image
 *      d. Fallback → no image (user can add later)
 *   4. Return detected products for review (NOT saved yet)
 *      Saving happens via POST /api/products/ingest/confirm
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Fuse from 'fuse.js';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DetectedProduct {
  name: string;
  localName?: string;
  brand?: string;
  variant?: string;       // e.g. "500g", "1L", "Regular"
  category?: string;
  estimatedPrice?: number;
  imageUrl?: string;
  imageSource?: 'global_catalog' | 'open_food_facts' | 'none';
  globalCatalogId?: string;
  isDuplicate?: boolean;  // already exists in this shop
  confidence: 'high' | 'medium' | 'low';
}

// ── Open Food Facts image lookup ──────────────────────────────────────────────
async function fetchOpenFoodFactsImage(productName: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(productName);
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=3&lc=en`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const products = data.products || [];
    // Find first product with a usable image
    for (const p of products) {
      const img = p.image_front_url || p.image_url || p.image_front_small_url;
      if (img && img.startsWith('https')) return img;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { imageBase64, shopId } = await request.json();

    if (!imageBase64 || !shopId) {
      return NextResponse.json({ error: 'Missing imageBase64 or shopId' }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    // ── 1. Fetch existing shop products + global catalog in parallel ──────────
    const [shopProductsSnap, globalCatalogSnap] = await Promise.all([
      getDocs(query(collection(db, 'products'), where('shopId', '==', shopId))),
      getDocs(collection(db, 'globalCatalog')),
    ]);

    const shopProducts = shopProductsSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    const globalCatalog = globalCatalogSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));

    const shopProductNames = new Set(shopProducts.map((p: any) => (p.name || '').toLowerCase().trim()));

    // Fuse for global catalog matching
    const globalFuse = new Fuse(globalCatalog, {
      keys: ['name', 'localName', 'brand'],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });

    // ── 2. Gemini Vision — detect products from image ─────────────────────────
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const prompt = `You are a product detection AI for an Indian kirana store.

Analyze this shelf/product image and identify ALL visible products.

For each product, extract:
- name: exact product name as printed on packaging (English)
- localName: Hindi/regional name if visible (optional)
- brand: brand name if visible (optional)
- variant: size/weight/flavor variant if visible, e.g. "500g", "1L", "Mango" (optional)
- category: one of [Snacks, Beverages, Dairy, Grains & Pulses, Spices, Personal Care, Household, Confectionery, Bakery, Frozen, Other]
- estimatedPrice: price in INR if visible on label (optional, number only)
- confidence: "high" if clearly readable, "medium" if partially visible, "low" if guessed

Rules:
- Include ALL products visible, even partially
- Do NOT include the same product twice
- If a shelf has 10 packets of the same product, list it ONCE
- Focus on product identity, not quantity on shelf
- Return empty array if no products detected`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
            ],
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name:           { type: 'STRING' },
                  localName:      { type: 'STRING' },
                  brand:          { type: 'STRING' },
                  variant:        { type: 'STRING' },
                  category:       { type: 'STRING' },
                  estimatedPrice: { type: 'NUMBER' },
                  confidence:     { type: 'STRING' },
                },
                required: ['name', 'confidence'],
              },
            },
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json();
      return NextResponse.json(
        { error: `Gemini error: ${err.error?.message || geminiRes.status}` },
        { status: 500 }
      );
    }

    const geminiData = await geminiRes.json();
    let rawDetected: any[] = [];
    try {
      rawDetected = JSON.parse(geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]');
    } catch {
      rawDetected = [];
    }

    if (!Array.isArray(rawDetected) || rawDetected.length === 0) {
      return NextResponse.json({ products: [], message: 'No products detected in this image' });
    }

    // ── 3. Enrich each detected product ──────────────────────────────────────
    const enriched: DetectedProduct[] = await Promise.all(
      rawDetected
        .filter(p => p.name && String(p.name).trim().length > 1)
        .map(async (detected: any) => {
          const name = String(detected.name || '').trim();
          const searchName = name.toLowerCase();

          // Check if already in this shop
          const isDuplicate = shopProductNames.has(searchName);

          // Try global catalog match
          const globalMatches = globalFuse.search(name);
          const globalMatch = globalMatches.length > 0 && (globalMatches[0].score ?? 1) <= 0.4
            ? globalMatches[0].item
            : null;

          let imageUrl: string | null = null;
          let imageSource: DetectedProduct['imageSource'] = 'none';

          if (globalMatch?.imageUrl) {
            // Reuse existing global catalog image
            imageUrl = globalMatch.imageUrl;
            imageSource = 'global_catalog';
          } else {
            // Try Open Food Facts
            const offImage = await fetchOpenFoodFactsImage(name);
            if (offImage) {
              imageUrl = offImage;
              imageSource = 'open_food_facts';
            }
          }

          return {
            name,
            localName: detected.localName || globalMatch?.localName || undefined,
            brand: detected.brand || undefined,
            variant: detected.variant || undefined,
            category: detected.category || globalMatch?.category || 'Other',
            estimatedPrice: detected.estimatedPrice || globalMatch?.price || undefined,
            imageUrl: imageUrl || undefined,
            imageSource,
            globalCatalogId: globalMatch?.id || undefined,
            isDuplicate,
            confidence: detected.confidence || 'medium',
          } as DetectedProduct;
        })
    );

    // Deduplicate by name (case-insensitive)
    const seen = new Set<string>();
    const deduped = enriched.filter(p => {
      const key = p.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({
      products: deduped,
      stats: {
        total: deduped.length,
        newProducts: deduped.filter(p => !p.isDuplicate).length,
        duplicates: deduped.filter(p => p.isDuplicate).length,
        withImages: deduped.filter(p => p.imageUrl).length,
        fromGlobalCatalog: deduped.filter(p => p.imageSource === 'global_catalog').length,
        fromOpenFoodFacts: deduped.filter(p => p.imageSource === 'open_food_facts').length,
      },
    });

  } catch (error: any) {
    console.error('Ingest error:', error);
    return NextResponse.json({ error: error.message || 'Ingestion failed' }, { status: 500 });
  }
}
