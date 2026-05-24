import fs from 'fs';
import path from 'path';
import https from 'https';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, addDoc, setDoc, query, where } from 'firebase/firestore';

// 1. Read environment variables from .env
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

console.log('Gemini API Key Loaded:', geminiKey ? geminiKey.slice(0, 8) + '...' : 'NOT FOUND');

// Firebase Configuration (Matching test_suggestions)
const firebaseConfig = {
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
  storageBucket: "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId: "1:339712048398:web:578ac498b0c942db7aab5f",
  measurementId: "G-J2Y7R4XMMN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const SHOP_ID = 'Yvgf5Us3pdNGHa0ljBGr'; // Shri Krishna Kirana

// Helper to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Call Gemini to generate localName and localAliases
async function generateLocalNameAndAliases(name, category) {
  if (!geminiKey) {
    return { localName: null, aliases: [] };
  }

  const prompt = `You are an expert system for Indian Kirana (grocery) stores.
Given a product's English name and its category, provide:
1. The Hindi translation or local Hindi name (e.g. "Dettol Soap Cool 75g" -> "डिटॉल कूल साबुन"). Keep it short and natural.
2. A list of 2 to 6 local Hindi name aliases, spelling variations, and common short names that customers might use when speaking or searching for this product in Hindi or Hinglish (e.g., "डिटॉल साबुन", "डिटोल साबुन", "डिटॉल कूल").

Product English Name: "${name}"
Product Category: "${category}"`;

  try {
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
                localName: { type: 'STRING' },
                aliases: {
                  type: 'ARRAY',
                  items: { type: 'STRING' }
                }
              },
              required: ['localName', 'aliases']
            }
          }
        })
      }
    );

    if (!res.ok) {
      console.error(`   ⚠️ Gemini API error: ${res.statusText}`);
      return { localName: null, aliases: [] };
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) return { localName: null, aliases: [] };

    const parsed = JSON.parse(text.trim());
    return {
      localName: parsed.localName || null,
      aliases: Array.isArray(parsed.aliases) ? parsed.aliases : []
    };
  } catch (error) {
    console.error("   ⚠️ Error in generateLocalNameAndAliases:", error.message || error);
    return { localName: null, aliases: [] };
  }
}

// Scrape Bing Image Url
function searchBingImage(query) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const match = data.match(/murl&quot;:&quot;(https:\/\/[^&]+)&quot;/);
        resolve(match ? match[1] : null);
      });
    }).on('error', reject);
  });
}

// Find Image URL
async function findImageUrl(name, category) {
  let query = name + ' grocery product India';
  if (category === 'Laundry') {
    query = name + ' detergent pack white background';
  } else if (category === 'Oils & Ghee') {
    query = name + ' cooking oil packet bottle white background';
  } else if (category === 'Spices & Masala') {
    query = name + ' masala box packet white background';
  } else if (name.toLowerCase().includes('khula') || name.toLowerCase().includes('loose')) {
    query = name.replace(/khula|loose/ig, '').trim() + ' loose raw in a bowl';
  }

  try {
    const img = await searchBingImage(query);
    if (img && img.startsWith('http')) return img;
  } catch (e) {
    console.error(`   ⚠️ Bing search failed for "${name}":`, e.message || e);
  }

  // Fallback to thumbnail URL pattern
  const fallbackQuery = name + ' site:bigbasket.com OR site:amazon.in';
  return `https://tse1.mm.bing.net/th?q=${encodeURIComponent(fallbackQuery)}`;
}

// 2. Deduplication Helpers
function extractWeight(name) {
  const match = name.match(/(\d+)\s*(kg|g|ml|l|packet|pouch|tin|jar|bar|sachet)/i);
  if (match) {
    let unit = match[2].toLowerCase();
    if (unit === 'kg' || unit === 'l' || unit === 'ml' || unit === 'g') {
      return { weight: parseInt(match[1]), unit };
    }
  }
  return null;
}

function extractBrand(name) {
  const nameLower = name.toLowerCase();
  const brands = ['everest', 'pushp', 'catch', 'suhana', 'dettol', 'nirma', 'kriti', 'ruchi star', 'ruchi', 'silver coin', 'tan man', 'ghadi', 'surf excel', 'surf', 'rin', 'tide', 'upadhyay'];
  for (const b of brands) {
    if (nameLower.includes(b)) return b;
  }
  return null;
}

function normalizeProductName(name) {
  let norm = name.toLowerCase();
  
  // Replace synonyms
  norm = norm.replace(/turmeric/g, 'haldi');
  norm = norm.replace(/coriander/g, 'dhaniya');
  norm = norm.replace(/cumin/g, 'jeera');
  norm = norm.replace(/chilli|chillies|chili/g, 'mirch');
  norm = norm.replace(/chhola chhana|kabuli chana/g, 'chana');
  
  // Remove weights/sizes
  norm = norm.replace(/\d+\s*(kg|g|ml|l|kg|packet|pouch|tin|jar|bar|sachet)\b/gi, '');
  
  // Remove descriptors
  const stopwords = ['powder', 'special', 'brand', 'pure', '100%', 'classic', 'premium', 'easy wash', 'active', 'detergent', 'antiseptic', 'liquid', 'soap'];
  for (const w of stopwords) {
    const rx = new RegExp('\\b' + w + '\\b', 'gi');
    norm = norm.replace(rx, '');
  }
  
  // Clean spacing
  norm = norm.replace(/[^a-z0-9\s]/g, '');
  return norm.trim().replace(/\s+/g, ' ');
}

function isDuplicate(candidate, existingList) {
  const candNameNorm = normalizeProductName(candidate.name);
  const candWeightInfo = extractWeight(candidate.name) || { weight: candidate.packetWeight, unit: candidate.packetUnit };
  const candBrand = candidate.brand?.toLowerCase() || extractBrand(candidate.name);

  for (const existing of existingList) {
    const existNameNorm = normalizeProductName(existing.name);
    const existWeightInfo = extractWeight(existing.name) || { weight: existing.packetWeight, unit: existing.packetUnit };
    const existBrand = existing.brand?.toLowerCase() || extractBrand(existing.name);

    const cWeight = candWeightInfo?.weight;
    const cUnit = candWeightInfo?.unit;
    const eWeight = existWeightInfo?.weight;
    const eUnit = existWeightInfo?.unit;

    // Direct clean string match
    const cNameClean = candidate.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const eNameClean = existing.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cNameClean === eNameClean) {
      return { duplicate: true, matchedWith: existing.name, reason: 'Direct clean name match' };
    }

    if (candBrand === existBrand && candNameNorm === existNameNorm && cWeight === eWeight && cUnit === eUnit) {
      return { duplicate: true, matchedWith: existing.name, reason: `Normalized match (${candBrand}, ${candNameNorm}, ${cWeight}${cUnit})` };
    }
  }
  return { duplicate: false };
}

// 3. Define Candidate Products List
const CANDIDATE_PRODUCTS = [
  // ── Dettol Products ──
  { name: "Dettol Antiseptic Liquid 100ml", brand: "Dettol", category: "Personal Care", price: 38, costPrice: 32, baseUnit: "ml", baseQuantity: 100, packetWeight: 100, packetUnit: "ml" },
  { name: "Dettol Antiseptic Liquid 250ml", brand: "Dettol", category: "Personal Care", price: 98, costPrice: 84, baseUnit: "ml", baseQuantity: 250, packetWeight: 250, packetUnit: "ml" },
  { name: "Dettol Antiseptic Liquid 500ml", brand: "Dettol", category: "Personal Care", price: 189, costPrice: 162, baseUnit: "ml", baseQuantity: 500, packetWeight: 500, packetUnit: "ml" },
  { name: "Dettol Antiseptic Liquid 1L", brand: "Dettol", category: "Personal Care", price: 331, costPrice: 285, baseUnit: "l", baseQuantity: 1, packetWeight: 1, packetUnit: "l" },
  { name: "Dettol Soap Original 125g", brand: "Dettol", category: "Soaps", price: 65, costPrice: 56, baseUnit: "g", baseQuantity: 125, packetWeight: 125, packetUnit: "g" },
  { name: "Dettol Soap Original 150g", brand: "Dettol", category: "Soaps", price: 82, costPrice: 70, baseUnit: "g", baseQuantity: 150, packetWeight: 150, packetUnit: "g" },
  { name: "Dettol Soap Cool 75g", brand: "Dettol", category: "Soaps", price: 42, costPrice: 36, baseUnit: "g", baseQuantity: 75, packetWeight: 75, packetUnit: "g" },
  { name: "Dettol Soap Cool 125g", brand: "Dettol", category: "Soaps", price: 68, costPrice: 58, baseUnit: "g", baseQuantity: 125, packetWeight: 125, packetUnit: "g" },
  { name: "Dettol Soap Skincare 75g", brand: "Dettol", category: "Soaps", price: 42, costPrice: 36, baseUnit: "g", baseQuantity: 75, packetWeight: 75, packetUnit: "g" },
  { name: "Dettol Soap Skincare 125g", brand: "Dettol", category: "Soaps", price: 68, costPrice: 58, baseUnit: "g", baseQuantity: 125, packetWeight: 125, packetUnit: "g" },
  { name: "Dettol Handwash Refill Pouch 900ml", brand: "Dettol", category: "Handwash", price: 169, costPrice: 145, baseUnit: "ml", baseQuantity: 900, packetWeight: 900, packetUnit: "ml" },
  { name: "Dettol Handwash Skincare Pump 200ml", brand: "Dettol", category: "Handwash", price: 95, costPrice: 81, baseUnit: "ml", baseQuantity: 200, packetWeight: 200, packetUnit: "ml" },
  { name: "Dettol Hand Sanitizer Instant Sanitizer 50ml", brand: "Dettol", category: "Handwash", price: 25, costPrice: 21, baseUnit: "ml", baseQuantity: 50, packetWeight: 50, packetUnit: "ml" },
  { name: "Dettol Hand Sanitizer Instant Sanitizer 200ml", brand: "Dettol", category: "Handwash", price: 100, costPrice: 85, baseUnit: "ml", baseQuantity: 200, packetWeight: 200, packetUnit: "ml" },

  // ── Ruchistar Oil Products ──
  { name: "Ruchi Star Refined Soyabean Oil 1L", brand: "Ruchi Star", category: "Oils & Ghee", price: 125, costPrice: 110, baseUnit: "l", baseQuantity: 1, packetWeight: 1, packetUnit: "l" },
  { name: "Ruchi Star Refined Soyabean Oil 5L", brand: "Ruchi Star", category: "Oils & Ghee", price: 620, costPrice: 540, baseUnit: "l", baseQuantity: 5, packetWeight: 5, packetUnit: "l" },
  { name: "Ruchi Star Refined Soyabean Oil 15L Tin", brand: "Ruchi Star", category: "Oils & Ghee", price: 1850, costPrice: 1620, baseUnit: "l", baseQuantity: 15, packetWeight: 15, packetUnit: "l" },
  { name: "Ruchi Star Refined Soyabean Oil 15kg Tin", brand: "Ruchi Star", category: "Oils & Ghee", price: 1980, costPrice: 1730, baseUnit: "kg", baseQuantity: 15, packetWeight: 15, packetUnit: "kg" },

  // ── Kriti Oil Products ──
  { name: "Kriti Refined Soyabean Oil 1L", brand: "Kriti", category: "Oils & Ghee", price: 130, costPrice: 114, baseUnit: "l", baseQuantity: 1, packetWeight: 1, packetUnit: "l" },
  { name: "Kriti Refined Soyabean Oil 2L", brand: "Kriti", category: "Oils & Ghee", price: 270, costPrice: 235, baseUnit: "l", baseQuantity: 2, packetWeight: 2, packetUnit: "l" },
  { name: "Kriti Refined Soyabean Oil 5L", brand: "Kriti", category: "Oils & Ghee", price: 640, costPrice: 560, baseUnit: "l", baseQuantity: 5, packetWeight: 5, packetUnit: "l" },
  { name: "Kriti Refined Soyabean Oil 15L Tin", brand: "Kriti", category: "Oils & Ghee", price: 1890, costPrice: 1650, baseUnit: "l", baseQuantity: 15, packetWeight: 15, packetUnit: "l" },

  // ── Staples & Dals ──
  { name: "Chhola Chhana Packet 500g", brand: "Generic", category: "Pulses & Dals", price: 65, costPrice: 55, baseUnit: "g", baseQuantity: 500, packetWeight: 500, packetUnit: "g" },
  { name: "Chhola Chhana Khula 1kg", brand: "Generic", category: "Pulses & Dals", price: 110, costPrice: 95, baseUnit: "kg", baseQuantity: 1, packetWeight: 1, packetUnit: "kg" },
  { name: "Moong Dal Hari Packet 500g", brand: "Generic", category: "Pulses & Dals", price: 68, costPrice: 58, baseUnit: "g", baseQuantity: 500, packetWeight: 500, packetUnit: "g" },
  { name: "Moong Dal Hari Khula 1kg", brand: "Generic", category: "Pulses & Dals", price: 120, costPrice: 105, baseUnit: "kg", baseQuantity: 1, packetWeight: 1, packetUnit: "kg" },
  { name: "Moong Dal Chhilka Packet 500g", brand: "Generic", category: "Pulses & Dals", price: 65, costPrice: 55, baseUnit: "g", baseQuantity: 500, packetWeight: 500, packetUnit: "g" },
  { name: "Moong Dal Chhilka Khula 1kg", brand: "Generic", category: "Pulses & Dals", price: 115, costPrice: 100, baseUnit: "kg", baseQuantity: 1, packetWeight: 1, packetUnit: "kg" },
  { name: "Silver Coin Rava Packet 500g", brand: "Silver Coin", category: "Grains & Cereals", price: 30, costPrice: 25, baseUnit: "g", baseQuantity: 500, packetWeight: 500, packetUnit: "g" },
  { name: "Silver Coin Rava Packet 1kg", brand: "Silver Coin", category: "Grains & Cereals", price: 55, costPrice: 47, baseUnit: "kg", baseQuantity: 1, packetWeight: 1, packetUnit: "kg" },
  { name: "HMT Rice Kolam 1kg", brand: "Generic", category: "Grains & Cereals", price: 75, costPrice: 65, baseUnit: "kg", baseQuantity: 1, packetWeight: 1, packetUnit: "kg" },
  { name: "HMT Rice Kolam 5kg", brand: "Generic", category: "Grains & Cereals", price: 360, costPrice: 310, baseUnit: "kg", baseQuantity: 5, packetWeight: 5, packetUnit: "kg" },
  { name: "HMT Rice Kolam 25kg Bag", brand: "Generic", category: "Grains & Cereals", price: 1680, costPrice: 1450, baseUnit: "kg", baseQuantity: 25, packetWeight: 25, packetUnit: "kg" },
  { name: "Parboiled Rice 1kg", brand: "Generic", category: "Grains & Cereals", price: 70, costPrice: 60, baseUnit: "kg", baseQuantity: 1, packetWeight: 1, packetUnit: "kg" },
  { name: "Parboiled Rice 5kg", brand: "Generic", category: "Grains & Cereals", price: 330, costPrice: 285, baseUnit: "kg", baseQuantity: 5, packetWeight: 5, packetUnit: "kg" },
  { name: "Parboiled Rice 25kg Bag", brand: "Generic", category: "Grains & Cereals", price: 1550, costPrice: 1350, baseUnit: "kg", baseQuantity: 25, packetWeight: 25, packetUnit: "kg" },
  { name: "Golden Rice 1kg", brand: "Generic", category: "Grains & Cereals", price: 75, costPrice: 65, baseUnit: "kg", baseQuantity: 1, packetWeight: 1, packetUnit: "kg" },
  { name: "Golden Rice 5kg", brand: "Generic", category: "Grains & Cereals", price: 350, costPrice: 300, baseUnit: "kg", baseQuantity: 5, packetWeight: 5, packetUnit: "kg" },
  { name: "Golden Rice 25kg Bag", brand: "Generic", category: "Grains & Cereals", price: 1600, costPrice: 1380, baseUnit: "kg", baseQuantity: 25, packetWeight: 25, packetUnit: "kg" },

  // ── Spices & Masalas ──
  { name: "Everest Paneer Masala 50g", brand: "Everest", category: "Spices & Masala", price: 45, costPrice: 38, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Everest Paneer Masala 100g", brand: "Everest", category: "Spices & Masala", price: 82, costPrice: 70, baseUnit: "g", baseQuantity: 100, packetWeight: 100, packetUnit: "g" },
  { name: "Pushp Jeeravan Masala 50g", brand: "Pushp", category: "Spices & Masala", price: 25, costPrice: 21, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Pushp Jeeravan Masala 100g", brand: "Pushp", category: "Spices & Masala", price: 45, costPrice: 38, baseUnit: "g", baseQuantity: 100, packetWeight: 100, packetUnit: "g" },
  { name: "Jeeravan Masala Khula 100g", brand: "Generic", category: "Spices & Masala", price: 35, costPrice: 28, baseUnit: "g", baseQuantity: 100, packetWeight: 100, packetUnit: "g" },

  // Daily Spices
  { name: "Everest Haldi Powder 50g", brand: "Everest", category: "Spices & Masala", price: 25, costPrice: 21, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Everest Haldi Powder 100g", brand: "Everest", category: "Spices & Masala", price: 45, costPrice: 38, baseUnit: "g", baseQuantity: 100, packetWeight: 100, packetUnit: "g" },
  { name: "Everest Haldi Powder 200g", brand: "Everest", category: "Spices & Masala", price: 85, costPrice: 72, baseUnit: "g", baseQuantity: 200, packetWeight: 200, packetUnit: "g" },
  { name: "Everest Haldi Powder 500g", brand: "Everest", category: "Spices & Masala", price: 195, costPrice: 165, baseUnit: "g", baseQuantity: 500, packetWeight: 500, packetUnit: "g" },
  { name: "Pushp Haldi Powder 50g", brand: "Pushp", category: "Spices & Masala", price: 25, costPrice: 21, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Pushp Haldi Powder 100g", brand: "Pushp", category: "Spices & Masala", price: 45, costPrice: 38, baseUnit: "g", baseQuantity: 100, packetWeight: 100, packetUnit: "g" },
  { name: "Pushp Haldi Powder 200g", brand: "Pushp", category: "Spices & Masala", price: 85, costPrice: 72, baseUnit: "g", baseQuantity: 200, packetWeight: 200, packetUnit: "g" },
  { name: "Pushp Haldi Powder 500g", brand: "Pushp", category: "Spices & Masala", price: 195, costPrice: 165, baseUnit: "g", baseQuantity: 500, packetWeight: 500, packetUnit: "g" },

  { name: "Everest Chilli Powder 50g", brand: "Everest", category: "Spices & Masala", price: 28, costPrice: 23, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Everest Chilli Powder 100g", brand: "Everest", category: "Spices & Masala", price: 52, costPrice: 44, baseUnit: "g", baseQuantity: 100, packetWeight: 100, packetUnit: "g" },
  { name: "Everest Chilli Powder 200g", brand: "Everest", category: "Spices & Masala", price: 98, costPrice: 83, baseUnit: "g", baseQuantity: 200, packetWeight: 200, packetUnit: "g" },
  { name: "Everest Chilli Powder 500g", brand: "Everest", category: "Spices & Masala", price: 235, costPrice: 199, baseUnit: "g", baseQuantity: 500, packetWeight: 500, packetUnit: "g" },
  { name: "Pushp Chilli Powder 50g", brand: "Pushp", category: "Spices & Masala", price: 28, costPrice: 23, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Pushp Chilli Powder 100g", brand: "Pushp", category: "Spices & Masala", price: 52, costPrice: 44, baseUnit: "g", baseQuantity: 100, packetWeight: 100, packetUnit: "g" },
  { name: "Pushp Chilli Powder 200g", brand: "Pushp", category: "Spices & Masala", price: 98, costPrice: 83, baseUnit: "g", baseQuantity: 200, packetWeight: 200, packetUnit: "g" },
  { name: "Pushp Chilli Powder 500g", brand: "Pushp", category: "Spices & Masala", price: 235, costPrice: 199, baseUnit: "g", baseQuantity: 500, packetWeight: 500, packetUnit: "g" },

  { name: "Everest Dhaniya Powder 50g", brand: "Everest", category: "Spices & Masala", price: 22, costPrice: 18, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Everest Dhaniya Powder 100g", brand: "Everest", category: "Spices & Masala", price: 40, costPrice: 34, baseUnit: "g", baseQuantity: 100, packetWeight: 100, packetUnit: "g" },
  { name: "Everest Dhaniya Powder 200g", brand: "Everest", category: "Spices & Masala", price: 75, costPrice: 63, baseUnit: "g", baseQuantity: 200, packetWeight: 200, packetUnit: "g" },
  { name: "Everest Dhaniya Powder 500g", brand: "Everest", category: "Spices & Masala", price: 175, costPrice: 148, baseUnit: "g", baseQuantity: 500, packetWeight: 500, packetUnit: "g" },
  { name: "Pushp Dhaniya Powder 50g", brand: "Pushp", category: "Spices & Masala", price: 22, costPrice: 18, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Pushp Dhaniya Powder 100g", brand: "Pushp", category: "Spices & Masala", price: 40, costPrice: 34, baseUnit: "g", baseQuantity: 100, packetWeight: 100, packetUnit: "g" },
  { name: "Pushp Dhaniya Powder 200g", brand: "Pushp", category: "Spices & Masala", price: 75, costPrice: 63, baseUnit: "g", baseQuantity: 200, packetWeight: 200, packetUnit: "g" },
  { name: "Pushp Dhaniya Powder 500g", brand: "Pushp", category: "Spices & Masala", price: 175, costPrice: 148, baseUnit: "g", baseQuantity: 500, packetWeight: 500, packetUnit: "g" },

  { name: "Everest Jeera Powder 50g", brand: "Everest", category: "Spices & Masala", price: 55, costPrice: 47, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Everest Jeera Powder 100g", brand: "Everest", category: "Spices & Masala", price: 100, costPrice: 85, baseUnit: "g", baseQuantity: 100, packetWeight: 100, packetUnit: "g" },
  { name: "Everest Jeera Powder 200g", brand: "Everest", category: "Spices & Masala", price: 190, costPrice: 160, baseUnit: "g", baseQuantity: 200, packetWeight: 200, packetUnit: "g" },
  { name: "Pushp Jeera Powder 50g", brand: "Pushp", category: "Spices & Masala", price: 55, costPrice: 47, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Pushp Jeera Powder 100g", brand: "Pushp", category: "Spices & Masala", price: 100, costPrice: 85, baseUnit: "g", baseQuantity: 100, packetWeight: 100, packetUnit: "g" },
  { name: "Pushp Jeera Powder 200g", brand: "Pushp", category: "Spices & Masala", price: 190, costPrice: 160, baseUnit: "g", baseQuantity: 200, packetWeight: 200, packetUnit: "g" },

  // Smaller Masala Packets
  { name: "Catch Biryani Masala 50g", brand: "Catch", category: "Spices & Masala", price: 48, costPrice: 40, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Catch Kashmiri Mirch Powder 50g", brand: "Catch", category: "Spices & Masala", price: 48, costPrice: 40, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Pushp Chhole Masala 50g", brand: "Pushp", category: "Spices & Masala", price: 42, costPrice: 35, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Everest Garam Masala 50g", brand: "Everest", category: "Spices & Masala", price: 42, costPrice: 35, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Everest Garam Masala 20g", brand: "Everest", category: "Spices & Masala", price: 15, costPrice: 12, baseUnit: "g", baseQuantity: 20, packetWeight: 20, packetUnit: "g" },
  { name: "Catch Mango Powder Amchur 50g", brand: "Catch", category: "Spices & Masala", price: 45, costPrice: 38, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Catch Sambhar Masala 50g", brand: "Catch", category: "Spices & Masala", price: 42, costPrice: 35, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Catch Chhole Masala 50g", brand: "Catch", category: "Spices & Masala", price: 42, costPrice: 35, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Everest Tikhalal Red Chilli Powder 50g", brand: "Everest", category: "Spices & Masala", price: 48, costPrice: 40, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Everest Cumin Powder 50g", brand: "Everest", category: "Spices & Masala", price: 55, costPrice: 47, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Everest Tea Masala 15g", brand: "Everest", category: "Spices & Masala", price: 20, costPrice: 16, baseUnit: "g", baseQuantity: 15, packetWeight: 15, packetUnit: "g" },
  { name: "Catch Raita Masala 50g", brand: "Catch", category: "Spices & Masala", price: 45, costPrice: 38, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },
  { name: "Everest Pav Bhaji Masala 50g", brand: "Everest", category: "Spices & Masala", price: 45, costPrice: 38, baseUnit: "g", baseQuantity: 50, packetWeight: 50, packetUnit: "g" },

  // ── Detergents ──
  { name: "Tan Man Detergent Powder 500g", brand: "Tan Man", category: "Laundry", price: 40, costPrice: 34, baseUnit: "g", baseQuantity: 500, packetWeight: 500, packetUnit: "g" },
  { name: "Tan Man Detergent Powder 1kg", brand: "Tan Man", category: "Laundry", price: 75, costPrice: 64, baseUnit: "kg", baseQuantity: 1, packetWeight: 1, packetUnit: "kg" },
  { name: "Tan Man Detergent Powder 3kg", brand: "Tan Man", category: "Laundry", price: 210, costPrice: 180, baseUnit: "kg", baseQuantity: 3, packetWeight: 3, packetUnit: "kg" },
  { name: "Tan Man Detergent Powder 5kg", brand: "Tan Man", category: "Laundry", price: 320, costPrice: 275, baseUnit: "kg", baseQuantity: 5, packetWeight: 5, packetUnit: "kg" },
  { name: "Ghadi Detergent Powder 3kg", brand: "Ghadi", category: "Laundry", price: 220, costPrice: 190, baseUnit: "kg", baseQuantity: 3, packetWeight: 3, packetUnit: "kg" },
  { name: "Ghadi Detergent Powder 5kg", brand: "Ghadi", category: "Laundry", price: 350, costPrice: 300, baseUnit: "kg", baseQuantity: 5, packetWeight: 5, packetUnit: "kg" },
  { name: "Surf Excel Easy Wash 3kg", brand: "Surf Excel", category: "Laundry", price: 390, costPrice: 330, baseUnit: "kg", baseQuantity: 3, packetWeight: 3, packetUnit: "kg" },
  { name: "Surf Excel Easy Wash 5kg", brand: "Surf Excel", category: "Laundry", price: 620, costPrice: 530, baseUnit: "kg", baseQuantity: 5, packetWeight: 5, packetUnit: "kg" },
  { name: "Rin Detergent Powder 3kg", brand: "Rin", category: "Laundry", price: 250, costPrice: 210, baseUnit: "kg", baseQuantity: 3, packetWeight: 3, packetUnit: "kg" },
  { name: "Rin Detergent Powder 5kg", brand: "Rin", category: "Laundry", price: 390, costPrice: 330, baseUnit: "kg", baseQuantity: 5, packetWeight: 5, packetUnit: "kg" },
  { name: "Tide Detergent Powder 3kg", brand: "Tide", category: "Laundry", price: 290, costPrice: 245, baseUnit: "kg", baseQuantity: 3, packetWeight: 3, packetUnit: "kg" },
  { name: "Tide Detergent Powder 5kg", brand: "Tide", category: "Laundry", price: 470, costPrice: 400, baseUnit: "kg", baseQuantity: 5, packetWeight: 5, packetUnit: "kg" }
];

async function migrate() {
  console.log('Fetching all existing products for shop:', SHOP_ID);
  const snapshot = await getDocs(query(collection(db, "products"), where("shopId", "==", SHOP_ID)));
  const existingProducts = [];
  snapshot.forEach(d => {
    existingProducts.push({ id: d.id, ...d.data() });
  });
  console.log(`Total existing products in shop: ${existingProducts.length}`);

  let added = 0;
  let skipped = 0;

  for (let i = 0; i < CANDIDATE_PRODUCTS.length; i++) {
    const cand = CANDIDATE_PRODUCTS[i];
    const progress = `[${i + 1}/${CANDIDATE_PRODUCTS.length}]`;
    
    // Check duplication
    const dupCheck = isDuplicate(cand, existingProducts);
    if (dupCheck.duplicate) {
      console.log(`${progress} ⏭️ SKIP: "${cand.name}" (Duplicate of existing: "${dupCheck.matchedWith}", Reason: ${dupCheck.reason})`);
      skipped++;
      continue;
    }

    console.log(`${progress} 🆕 ADDING: "${cand.name}"`);

    // Fetch Image URL
    console.log(`   🔍 Searching image for "${cand.name}"...`);
    const imageUrl = await findImageUrl(cand.name, cand.category);
    console.log(`   🖼️ Image selected: "${imageUrl}"`);

    // Call Gemini API for localName and localAliases
    let localName = null;
    let localAliases = [];
    if (geminiKey) {
      console.log(`   🤖 Generating Hindi local name and aliases via Gemini...`);
      const geminiResult = await generateLocalNameAndAliases(cand.name, cand.category);
      localName = geminiResult.localName;
      localAliases = geminiResult.aliases;
      console.log(`      localName: "${localName}"`);
      console.log(`      aliases: ${JSON.stringify(localAliases)}`);
      // Sleep to avoid Gemini rate limits
      await sleep(1000);
    }

    // Prepare Firestore product document
    const productDoc = {
      name: cand.name,
      localName: localName,
      localAliases: localAliases,
      brand: cand.brand,
      category: cand.category,
      price: cand.price,
      costPrice: cand.costPrice || 0,
      baseUnit: cand.baseUnit || "pc",
      baseQuantity: cand.baseQuantity || 1,
      packetWeight: cand.packetWeight || null,
      packetUnit: cand.packetUnit || null,
      imageUrl: imageUrl,
      shopId: SHOP_ID,
      createdAt: new Date().toISOString(),
      source: "manual_ingest"
    };

    // Add to products collection
    const docRef = await addDoc(collection(db, "products"), productDoc);
    console.log(`   ✅ Firestore product added! ID: ${docRef.id}`);

    // Sync to globalCatalog as template (use merged nameKey for id)
    const nameKey = cand.name.toLowerCase().trim();
    const gcId = `gc_${nameKey.replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 60)}`;
    await setDoc(doc(db, "globalCatalog", gcId), {
      name: cand.name,
      localName: localName,
      brand: cand.brand,
      category: cand.category,
      baseUnit: cand.baseUnit || "pc",
      baseQuantity: cand.baseQuantity || 1,
      price: cand.price,
      imageUrl: imageUrl,
      createdAt: new Date().toISOString(),
      sourceShopId: SHOP_ID
    }, { merge: true });
    console.log(`   ✅ globalCatalog synced! ID: ${gcId}`);

    // Update list of existingProducts to prevent duplicate insertions within this run itself
    existingProducts.push({
      id: docRef.id,
      name: cand.name,
      brand: cand.brand,
      category: cand.category,
      price: cand.price,
      baseUnit: cand.baseUnit || "pc",
      baseQuantity: cand.baseQuantity || 1,
      packetWeight: cand.packetWeight || null,
      packetUnit: cand.packetUnit || null
    });

    added++;
  }

  console.log('\n=== MIGRATION COMPLETE ===');
  console.log(`Added: ${added}`);
  console.log(`Skipped (Duplicates): ${skipped}`);
}

migrate().catch(console.error);
