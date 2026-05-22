import { NextResponse } from 'next/server';

/**
 * POST /api/products/process-image
 * 
 * Takes a base64 image, removes background via remove.bg API,
 * returns a clean base64 PNG with white background (Amazon-style).
 * 
 * Falls back to original image if remove.bg fails.
 */
export async function POST(request: Request) {
  let imageBase64 = '';
  try {
    const body = await request.json();
    imageBase64 = body.imageBase64 || '';
    if (!imageBase64) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) {
      // No key configured — return original image unchanged
      return NextResponse.json({ imageBase64, removed: false });
    }

    // Strip data URL prefix
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Call remove.bg API
    const formData = new FormData();
    formData.append('image_file_b64', base64Data);
    formData.append('size', 'auto');
    formData.append('format', 'png');

    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn('remove.bg error:', err.slice(0, 200));
      // Fallback: return original
      return NextResponse.json({ imageBase64, removed: false });
    }

    // Get PNG buffer with transparent background
    const buffer = await res.arrayBuffer();
    const pngBase64 = `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;

    return NextResponse.json({ imageBase64: pngBase64, removed: true });
  } catch (error: any) {
    console.error('process-image error:', error.message);
    // Always fallback gracefully with the original base64 string
    return NextResponse.json({ imageBase64: imageBase64 || null, removed: false });
  }
}
