import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

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

// Helper to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Call Gemini to generate aliases
async function generateLocalAliases(name, localName) {
  if (!geminiKey) {
    return [];
  }

  const prompt = `You are an expert system for Indian Kirana (grocery) stores.
Given a product's English name and its Hindi local name, generate a list of local Hindi name aliases, spelling variations, and common short names that customers might use when speaking or searching for this product in Hindi or Hinglish.

Guidelines:
1. Include common short names (e.g., brand + category: "लक्स साबुन" for "लक्स सॉफ्ट ग्लो साबुन", "कोलगेट टूथपेस्ट" for "कोलगेट स्ट्रॉन्ग टीथ टूथपेस्ट").
2. Include spelling/pronunciation variations (e.g., "लॉन्ग", "लांग", "लौंग" for "Laung Khula", "नवरतन तेल" for "नवरत्न हेयर ऑयल").
3. Include local/regional descriptions (e.g. "कपड़ा साबुन" or "निरमा साबुन" for "निरमा डिटर्जेंट बार").
4. Keep the list concise and highly relevant (between 2 to 6 aliases).

Product English Name: "${name}"
Product Hindi Name: "${localName || ''}"`;

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

    if (!res.ok) {
      console.error(`   ⚠️ Gemini API error: ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) return [];

    const parsed = JSON.parse(text.trim());
    return Array.isArray(parsed.aliases) ? parsed.aliases : [];
  } catch (error) {
    console.error("   ⚠️ Error in generateLocalAliases:", error.message || error);
    return [];
  }
}

// 2. Parse kirana-catalog.ts to extract predefined aliases
const catalogPath = path.resolve(process.cwd(), 'src/lib/kirana-catalog.ts');
const catalogMap = new Map();
if (fs.existsSync(catalogPath)) {
  const catalogText = fs.readFileSync(catalogPath, 'utf-8');
  // Match: name: "...", aliases: [...]
  const matches = catalogText.matchAll(/name:\s*"([^"]+)"[^}]+aliases:\s*(\[[^\]]+\])/g);
  for (const match of matches) {
    const name = match[1].toLowerCase().trim();
    try {
      // parse the aliases array
      const aliases = JSON.parse(match[2].replace(/'/g, '"'));
      catalogMap.set(name, aliases);
    } catch (e) {
      // Ignore parse issues
    }
  }
}

console.log(`Predefined catalog mappings loaded: ${catalogMap.size} products.`);

async function migrate() {
  console.log('Fetching all products from Firestore...');
  const snapshot = await getDocs(collection(db, "products"));
  const docs = [];
  snapshot.forEach(d => {
    docs.push({ id: d.id, ...d.data() });
  });

  console.log(`Total products fetched: ${docs.length}`);
  
  let updatedCount = 0;
  let skippedCount = 0;
  let apiCount = 0;
  let catalogHitCount = 0;

  for (let i = 0; i < docs.length; i++) {
    const p = docs[i];
    const progress = `[${i + 1}/${docs.length}]`;
    
    // Check if aliases already exist
    if (p.localAliases && Array.isArray(p.localAliases) && p.localAliases.length > 0) {
      skippedCount++;
      continue;
    }

    const nameClean = (p.name || '').toLowerCase().trim();
    let aliases = [];

    // Try finding predefined match in catalog
    // Match either exact or if it starts with the catalog name (e.g. "Tata Salt 1kg" matching "tata salt" mapping)
    let matchedAliases = null;
    for (const [catName, catAliases] of catalogMap.entries()) {
      if (nameClean === catName || nameClean.startsWith(catName + ' ') || catName.startsWith(nameClean + ' ')) {
        matchedAliases = catAliases;
        break;
      }
    }

    if (matchedAliases) {
      aliases = matchedAliases;
      catalogHitCount++;
      console.log(`${progress} Matched from catalog cache: "${p.name}" -> ${JSON.stringify(aliases)}`);
    } else {
      // Call Gemini API
      apiCount++;
      console.log(`${progress} Calling Gemini for: "${p.name}" / "${p.localName || ''}"`);
      aliases = await generateLocalAliases(p.name, p.localName || null);
      console.log(`   🤖 Gemini output: ${JSON.stringify(aliases)}`);
      // Sleep to avoid rate limiting
      await sleep(1000);
    }

    if (aliases && aliases.length > 0) {
      await updateDoc(doc(db, "products", p.id), {
        localAliases: aliases
      });
      updatedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log('\n=== MIGRATION COMPLETE ===');
  console.log(`Updated products: ${updatedCount}`);
  console.log(`Skipped products (already had aliases or failed): ${skippedCount}`);
  console.log(`Catalog cache hits: ${catalogHitCount}`);
  console.log(`Gemini API calls: ${apiCount}`);
}

migrate().catch(console.error);
