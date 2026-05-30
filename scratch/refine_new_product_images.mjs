import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import https from 'https';

// --- CONFIGURATION ---
const DRY_RUN = false; // Set to false to perform actual database updates
const SHOP_ID = "Yvgf5Us3pdNGHa0ljBGr"; // Shree Krishna Kirana
const DELAY_MS = 2000; // Sleep delay between products to prevent rate limits
// ---------------------

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

const firebaseConfig = {
  apiKey: "AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk",
  authDomain: "retlex-ai.firebaseapp.com",
  projectId: "retlex-ai",
  storageBucket: "retlex-ai.firebasestorage.app",
  messagingSenderId: "339712048398",
  appId: "1:339712048398:web:578ac498b0c942db7aab5f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper function to sleep/delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const TRUSTED_DOMAINS = [
  'bbassets.com',
  'bigbasket.com',
  'media-amazon.com',
  'ssl-images-amazon.com',
  'amazon.in',
  'amazon.com',
  'jiomart.com',
  'cdn.fynd.com',
  'jiomartjcp.com',
  'blinkit.com',
  'grofers.com',
  'imimg.com',
  'dmart.in',
  'flipkart.com',
  'freshtohome.com'
];

const BLACKLIST_KEYWORDS = [
  'wallpaper', 'freepik', 'pinterest', 'slideshare', 'slideserve', 'vector',
  'researchgate', 'shutterstock', 'dreamstime', '123rf', 'stock', 'depositphotos',
  'facebook', 'instagram', 'twitter', 'youtube', 'yimg.com', 'zenfs.com', 'tse1.mm.bing.net',
  'eporner', 'porn', 'lovepik', 'wordstemplates', 'alamy', 'watermark', 'imggen', 'medical', 
  'template', 'cartoon', 'illustration', 'drawings', 'clipart', 'sketch'
];

// Helper function to send GET request
function fetchUrl(url, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      ...customHeaders
    };
    
    https.get(url, { headers }, (res) => {
      // Handle HTTP redirects
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        if (res.headers.location) {
          let redirectLoc = res.headers.location;
          if (!redirectLoc.startsWith('http')) {
            const parentUrl = new URL(url);
            redirectLoc = `${parentUrl.protocol}//${parentUrl.host}${redirectLoc.startsWith('/') ? '' : '/'}${redirectLoc}`;
          }
          resolve({ redirectUrl: redirectLoc, statusCode: res.statusCode });
          return;
        }
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ html: data, statusCode: res.statusCode });
      });
    }).on('error', reject);
  });
}

// Recursively follow Google/Search redirects to find final landing page
async function resolveRedirectUrl(url) {
  let currentUrl = url;
  let attempts = 0;
  while (attempts < 5) {
    try {
      const res = await fetchUrl(currentUrl);
      if (res.redirectUrl) {
        currentUrl = res.redirectUrl;
        attempts++;
      } else {
        return currentUrl;
      }
    } catch (e) {
      console.error(`  ⚠️ Redirect resolution failed for ${currentUrl}:`, e.message);
      return currentUrl;
    }
  }
  return currentUrl;
}

// Helper to extract nested URLs from search engine redirects
function extractNestedUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    const params = ['imgurl', 'mediaurl', 'ru', 'url', 'rurl', 'ou'];
    for (const p of params) {
      const val = url.searchParams.get(p);
      if (val && (val.startsWith('http://') || val.startsWith('https://'))) {
        return val;
      }
    }
  } catch (e) {
    const nestedRegex = /(?:imgurl|mediaurl|ru|url|rurl|ou)=(https?%3A%2F%2F[^&"'\s>]+)/i;
    const match = urlStr.match(nestedRegex);
    if (match) {
      try {
        return decodeURIComponent(match[1]);
      } catch (err) {}
    }
  }
  return urlStr;
}

// Extract product images from raw HTML based on domain name
function extractImageFromHtml(html, targetUrl) {
  const urlLower = targetUrl.toLowerCase();
  
  if (urlLower.includes('bigbasket.com')) {
    // BigBasket image domains: bbassets.com
    const regex = /https?:\/\/(?:www\.)?bbassets\.com\/media\/uploads\/p\/(?:l|m|s|xl|xxl)\/[^"'\s>?]+/g;
    const matches = html.match(regex) || [];
    
    // Check if the page is a Next.js error or "Product not found"
    if (html.includes('No Product found') || html.includes('SKU API Fail')) {
      return null;
    }
    
    if (matches.length > 0) {
      const sorted = matches.sort((a, b) => {
        const getRank = (str) => {
          if (str.includes('/p/xxl/')) return 5;
          if (str.includes('/p/xl/')) return 4;
          if (str.includes('/p/l/')) return 3;
          if (str.includes('/p/m/')) return 2;
          if (str.includes('/p/s/')) return 1;
          return 0;
        };
        return getRank(b) - getRank(a);
      });
      return sorted[0].replace(/&amp;/g, '&');
    }
  }
  
  if (urlLower.includes('jiomart.com')) {
    // JioMart CDN domains: cdn.fynd.com, cdn1.jiomartjcp.com, pixelbin.io
    const regex = /https?:\/\/(?:[^\s"'>]+)?(?:cdn\.fynd\.com|jiomartjcp\.com|pixelbin\.io)\/[^\s"'>]+\.(?:jpg|jpeg|png|webp)/gi;
    const matches = html.match(regex) || [];
    if (matches.length > 0) {
      const productImgs = matches.filter(m => m.includes('/products/pictures/') || m.includes('/item/'));
      if (productImgs.length > 0) {
        return productImgs[0].replace(/&amp;/g, '&');
      }
      return matches[0].replace(/&amp;/g, '&');
    }
  }
  
  if (urlLower.includes('amazon.in') || urlLower.includes('amazon.com')) {
    const regex = /https?:\/\/(?:images-na\.ssl-images-amazon\.com|media-amazon\.com|m\.media-amazon\.com)\/images\/I\/[^"'\s>?]+/g;
    const matches = html.match(regex) || [];
    if (matches.length > 0) {
      return matches[0].replace(/&amp;/g, '&');
    }
  }

  if (urlLower.includes('blinkit.com') || urlLower.includes('grofers.com')) {
    const regex = /https?:\/\/(?:(?:www|cdn|images)\.)?(?:blinkit\.com|grofers\.com)\/[^"'\s>?]+\.(?:jpg|jpeg|png|webp)/gi;
    const matches = html.match(regex) || [];
    if (matches.length > 0) {
      return matches[0].replace(/&amp;/g, '&');
    }
  }

  // Fallback: search for any image hosted on trusted hosts in the page
  const generalRegex = /https?:\/\/[^"'\s>]+?\.(?:jpg|jpeg|png|webp)/gi;
  const generalMatches = html.match(generalRegex) || [];
  const trustedHosts = ['bbassets.com', 'media-amazon.com', 'jiomart.com', 'blinkit.com', 'grofers.com', 'dmart.in', 'cdn.fynd.com'];
  for (const match of generalMatches) {
    if (trustedHosts.some(host => match.includes(host))) {
      return match.replace(/&amp;/g, '&');
    }
  }
  
  return null;
}

// Scrape Yahoo Web Urls
function searchYahooWeb(query) {
  return new Promise((resolve, reject) => {
    https.get(`https://search.yahoo.com/search?p=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', reject);
  });
}

function extractImagesFromYahooHtml(html) {
  const urls = [];
  const cleanHtml = html.replaceAll('\\/', '/').replaceAll('\\u002F', '/');
  
  // Extract patterns like imgurl=... or ou=... and decode them safely
  const regex = /(?:imgurl|ou)=([^&"'\s>]+)/g;
  let match;
  while ((match = regex.exec(cleanHtml)) !== null) {
    try {
      const decoded = decodeURIComponent(match[1]);
      if (decoded.startsWith('http')) {
        urls.push(extractNestedUrl(decoded));
      }
    } catch (e) {}
  }
  
  // General HTTP URLs regex
  const urlRegex = /https?:\/\/[^"'\s>&]+/g;
  let urlMatch;
  while ((urlMatch = urlRegex.exec(cleanHtml)) !== null) {
    try {
      const decoded = decodeURIComponent(urlMatch[0]);
      urls.push(extractNestedUrl(decoded));
    } catch (e) {
      urls.push(extractNestedUrl(urlMatch[0]));
    }
  }
  
  return [...new Set(urls)];
}

// Scrape Bing Image Urls
function searchBingImages(query) {
  return new Promise((resolve, reject) => {
    https.get(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const matches = [];
        const regex = /murl&quot;:&quot;(https:\/\/[^&]+)&quot;/g;
        let match;
        while ((match = regex.exec(data)) !== null) {
          matches.push(match[1]);
        }
        resolve(matches);
      });
    }).on('error', reject);
  });
}

function isLikelyImage(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    
    // Ignore landing pages or empty paths
    if (pathname === '/' || pathname === '' || pathname === '/index.html' || pathname === '/index.php') {
      return false;
    }
    
    // Ignore search engine domains completely
    if (host.includes('yahoo.com') || host.includes('bing.com') || host.includes('google.') || host.includes('duckduckgo.')) {
      return false;
    }
    
    // Common image extensions (either at end of path or before query params)
    if (pathname.match(/\.(jpg|jpeg|png|webp|gif)$/) || pathname.match(/\.(jpg|jpeg|png|webp|gif)\?/)) {
      return true;
    }
    if (url.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)/)) {
      return true;
    }
    
    // Known image-only CDN paths
    if (host.includes('bbassets.com') && pathname.includes('/media/')) {
      return true;
    }
    if ((host.includes('media-amazon.com') || host.includes('images-amazon.com') || host.includes('ssl-images-amazon.com')) && pathname.includes('/images/i/')) {
      return true;
    }
    if (host.includes('cdn.fynd.com') && (pathname.includes('/products/pictures/') || pathname.includes('/item/'))) {
      return true;
    }
    if (host.includes('pixelbin.io') && pathname.includes('/item/')) {
      return true;
    }
    if (host.includes('imimg.com')) {
      return true;
    }
  } catch (e) {}
  return false;
}

function cleanUrl(url) {
  return url.replace(/&amp;/g, '&').replace(/\s/g, '%20');
}

function isTrustedOrCommerceDomain(url) {
  const lower = url.toLowerCase();
  
  // Explicitly trusted grocery/retail domains
  const trusted = [
    'bbassets.com', 'bigbasket.com', 'jiomart.com', 'fynd.com', 'jiomartjcp.com', 
    'pixelbin.io', 'amazon.in', 'media-amazon.com', 'images-amazon.com', 
    'ssl-images-amazon.com', 'blinkit.com', 'grofers.com', 'imimg.com', 'indiamart.com',
    'dmart.in', 'flipkart.com', 'freshtohome.com', 'kesargrocery.com', 
    'onehealth.pk', 'asianhalalokayama.com', 'spices.com', 'patanjaliayurved.net',
    'naturesbasket.co.in', 'jiomart.com'
  ];
  
  if (trusted.some(domain => lower.includes(domain))) {
    return true;
  }
  
  // Check if domain looks like an e-commerce, grocery, or retail store
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const storeKeywords = ['shop', 'store', 'grocery', 'mart', 'supermarket', 'spices', 'foods', 'bazar', 'deal', 'cart', 'market', 'spice', 'retail', 'indianspices', 'organic', 'masala', 'agarbatti', 'cookie'];
    if (storeKeywords.some(kw => host.includes(kw))) {
      return true;
    }
  } catch (e) {}
  
  return false;
}

function selectBestImage(urls) {
  for (const url of urls) {
    if (!isLikelyImage(url)) continue;
    
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      const lower = url.toLowerCase();
      
      // Check BigBasket
      if (host.includes('bbassets.com') || host.includes('bigbasket.com')) {
        return { url: cleanUrl(url), source: 'bigbasket' };
      }
      
      // Check JioMart
      if (host.includes('jiomart.com') || host.includes('cdn.fynd.com') || host.includes('jiomartjcp.com') || host.includes('pixelbin.io')) {
        return { url: cleanUrl(url), source: 'jiomart' };
      }
      
      // Check Amazon (must be Item image '/images/I/')
      if ((host.includes('amazon.in') || host.includes('media-amazon.com') || host.includes('images-amazon.com') || host.includes('ssl-images-amazon.com')) && lower.includes('/images/i/')) {
        return { url: cleanUrl(url), source: 'amazon' };
      }
      
      // Check Blinkit
      if (host.includes('blinkit.com') || host.includes('grofers.com')) {
        return { url: cleanUrl(url), source: 'blinkit' };
      }
      
      // Check Indiamart
      if (host.includes('imimg.com')) {
        return { url: cleanUrl(url), source: 'indiamart' };
      }
    } catch (e) {
      // If new URL(url) throws, ignore
      continue;
    }
  }
  
  // Try to find any direct image that is not blacklisted AND is a trusted/commerce domain
  for (const url of urls) {
    if (!isLikelyImage(url)) continue;
    if (!isTrustedOrCommerceDomain(url)) continue;
    
    try {
      const lower = url.toLowerCase();
      const isBlacklisted = BLACKLIST_KEYWORDS.some(kw => lower.includes(kw));
      if (!isBlacklisted) {
        return { url: cleanUrl(url), source: 'general-web' };
      }
    } catch (e) {
      continue;
    }
  }
  
  return null;
}

// Call Gemini Search Grounding API and return all candidate search redirect URLs
async function getGeminiSearchRedirects(productName) {
  const prompt = `Search for the product "${productName}" on retail, grocery, e-commerce, or wholesale sites (such as bigbasket.com, jiomart.com, amazon.in, blinkit.com, flipkart.com, indiamart.com, or tradeindia.com).
Find the store product listing page.
Output ONLY the URL string, with no markdown, no quotes, and no other text.`;

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
            maxOutputTokens: 2048
          }
        })
      }
    );

    const data = await res.json();
    const urls = [];
    
    // 1. Extract from candidates text
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      const text = data.candidates[0].content.parts[0].text.trim();
      const urlRegex = /https?:\/\/vertexaisearch\.cloud\.google\.com\/grounding-api-redirect\/[^\s"']+/g;
      let match;
      while ((match = urlRegex.exec(text)) !== null) {
        urls.push(match[0]);
      }
    }
    
    // 2. Extract from search grounding metadata chunks
    const chunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    for (const chunk of chunks) {
      if (chunk.web?.uri && !urls.includes(chunk.web.uri)) {
        urls.push(chunk.web.uri);
      }
    }
    
    // 3. Extract from search entry point rendered content as a fallback
    const rendered = data.candidates?.[0]?.groundingMetadata?.searchEntryPoint?.renderedContent || '';
    const hrefRegex = /href="([^"]+)"/g;
    let hrefMatch;
    while ((hrefMatch = hrefRegex.exec(rendered)) !== null) {
      if (hrefMatch[1].includes('grounding-api-redirect') && !urls.includes(hrefMatch[1])) {
        urls.push(hrefMatch[1]);
      }
    }
    
    return urls.map(url => extractNestedUrl(url));
  } catch (e) {
    console.error(`  ⚠️ Gemini API search grounding failed for "${productName}":`, e.message);
    return [];
  }
}

async function refineProductImageSingleTerm(p, queryTerm, idx, total) {
  // STAGE 1: Live Page Parsing via Gemini Grounding
  console.log(`   [Stage 1] Querying Gemini search grounding with query: "${queryTerm}"...`);
  const redirects = await getGeminiSearchRedirects(queryTerm);
  if (redirects.length > 0) {
    console.log(`   Found ${redirects.length} search redirect URLs.`);
    for (let rIdx = 0; rIdx < redirects.length; rIdx++) {
      const redirectUrl = redirects[rIdx];
      console.log(`     [Attempt ${rIdx + 1}/${redirects.length}] Resolving: ${redirectUrl.substring(0, 90)}...`);
      const resolvedUrl = await resolveRedirectUrl(redirectUrl);
      console.log(`       -> Resolved to: ${resolvedUrl}`);
      
      // Skip resolving Google search result query pages
      if (resolvedUrl.includes('google.com/search')) {
        console.log(`       ⚠️ Skipping Google search query results page.`);
        continue;
      }
      
      try {
        const pageRes = await fetchUrl(resolvedUrl);
        if (pageRes.html) {
          const refinedImageUrl = extractImageFromHtml(pageRes.html, resolvedUrl);
          if (refinedImageUrl) {
            console.log(`       🎉 [Stage 1 Success] Refined Image: ${refinedImageUrl}`);
            return {
              productId: p.id,
              productName: p.name,
              oldImageUrl: p.imageUrl,
              newImageUrl: refinedImageUrl,
              globalCatalogId: p.globalCatalogId || null
            };
          }
        }
      } catch (e) {
        console.error(`       ⚠️ Failed to fetch/parse page:`, e.message);
      }
      console.log(`     ❌ Image extraction failed for this source.`);
    }
  } else {
    console.log(`   ⚠️ Stage 1: No product page links found.`);
  }
  
  // STAGE 2: Yahoo Web Search Scrape Fallback
  console.log(`   [Stage 2] Stage 1 failed. Running Yahoo Web Search scrape...`);
  try {
    const searchQueries = [
      `${queryTerm} site:bigbasket.com OR site:amazon.in OR site:jiomart.com OR site:blinkit.com`,
      `${queryTerm} grocery packaging`
    ];
    
    for (const q of searchQueries) {
      console.log(`     Searching Yahoo Web for: "${q}"`);
      const html = await searchYahooWeb(q);
      const urls = extractImagesFromYahooHtml(html);
      const best = selectBestImage(urls);
      if (best) {
        console.log(`     🎉 [Stage 2 Success] Selected Image: ${best.url} (Source: ${best.source})`);
        return {
          productId: p.id,
          productName: p.name,
          oldImageUrl: p.imageUrl,
          newImageUrl: best.url,
          globalCatalogId: p.globalCatalogId || null
        };
      }
    }
  } catch (e) {
    console.error(`     ⚠️ Yahoo Web scrape failed:`, e.message);
  }
  
  // STAGE 3: Bing Image Search Scrape Fallback
  console.log(`   [Stage 3] Stage 2 failed. Running Bing Images scrape...`);
  try {
    const searchQueries = [
      `"${queryTerm}" site:bigbasket.com OR site:amazon.in OR site:jiomart.com`,
      `"${queryTerm}" grocery packaging`
    ];
    
    for (const q of searchQueries) {
      console.log(`     Searching Bing Images for: "${q}"`);
      const urls = await searchBingImages(q);
      const decodedUrls = urls.map(u => extractNestedUrl(u));
      const best = selectBestImage(decodedUrls);
      if (best) {
        console.log(`     🎉 [Stage 3 Success] Selected Image: ${best.url} (Source: ${best.source})`);
        return {
          productId: p.id,
          productName: p.name,
          oldImageUrl: p.imageUrl,
          newImageUrl: best.url,
          globalCatalogId: p.globalCatalogId || null
        };
      }
    }
  } catch (e) {
    console.error(`     ⚠️ Bing scrape failed:`, e.message);
  }
  
  return null;
}

function getFallbackQueryTerm(name) {
  // Strip patterns like "50g", "200g", "1kg", "500ml", "1.5L", "25kg Bag", "Packet 500g" etc.
  return name.replace(/\b\d+(?:\.\d+)?\s*(?:g|gm|kg|ml|l|tin|bag|packet|pcs|pc)\b/ig, '').replace(/\s+/g, ' ').trim();
}

async function refineProductImage(p, idx, total) {
  console.log(`\n[${idx}/${total}] 🔄 Processing: "${p.name}" (ID: ${p.id})`);
  console.log(`   Old Image URL: ${p.imageUrl}`);
  
  const nameLower = p.name.toLowerCase();
  const queriesToTry = [];
  
  const isLoose = nameLower.includes('loose') || nameLower.includes('khula') || (p.unit === 'kg' && !nameLower.match(/5kg|10kg|1kg/));
  
  if (isLoose) {
    const baseName = p.name.replace(/loose|khula/ig, '').trim();
    const cleanBase = getFallbackQueryTerm(baseName);
    queriesToTry.push(`heap of ${cleanBase} isolated on white background`);
    queriesToTry.push(cleanBase);
  } else {
    queriesToTry.push(p.name);
    
    // Fallback 1: strip weight/size
    const fallbackName = getFallbackQueryTerm(p.name);
    if (fallbackName && fallbackName !== p.name) {
      queriesToTry.push(fallbackName);
    }
    
    // Fallback 2: translation for Dhaniya
    if (nameLower.includes('dhaniya')) {
      const corianderName = p.name.replace(/dhaniya/ig, 'Coriander');
      queriesToTry.push(corianderName);
      const fallbackCoriander = getFallbackQueryTerm(corianderName);
      if (fallbackCoriander && fallbackCoriander !== corianderName) {
        queriesToTry.push(fallbackCoriander);
      }
    }
    
    // Fallback 3: reorder Rice Kolam
    if (nameLower.includes('rice kolam')) {
      const reordered = p.name.replace(/rice kolam/ig, 'Kolam Rice');
      queriesToTry.push(reordered);
      queriesToTry.push(getFallbackQueryTerm(reordered));
      queriesToTry.push('Kolam Rice');
    } else if (nameLower.includes('kolam rice')) {
      const reordered = p.name.replace(/kolam rice/ig, 'Rice Kolam');
      queriesToTry.push(reordered);
      queriesToTry.push(getFallbackQueryTerm(reordered));
      queriesToTry.push('Rice Kolam');
    }
  }

  for (let qIdx = 0; qIdx < queriesToTry.length; qIdx++) {
    const q = queriesToTry[qIdx];
    console.log(`   👉 Attempt ${qIdx + 1}/${queriesToTry.length} using query: "${q}"`);
    const res = await refineProductImageSingleTerm(p, q, idx, total);
    if (res) {
      return res;
    }
  }

  console.log(`   ❌ FAILED: All queries and fallbacks exhausted for "${p.name}".`);
  return null;
}

async function main() {
  console.log('🚀 Loading target products from Firestore...');
  const snap = await getDocs(query(collection(db, "products"), where("shopId", "==", SHOP_ID)));
  const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Identify suspicious products
  const wrongImagePatterns = [
    'tse1.mm.bing.net/th?q=',
    'slideserve.com',
    'pxfuel.com',
    '5startoolboxstore.com',
    'freepik.com',
    'researchgate.net',
    'wallpaper',
    'img.mandarake.co.jp',
    'pic2.zhimg.com',
    'beamimagination.com',
    'awesomestuff365.com',
    'shozemi.com',
    'cdn.amebaowndme.com',
    's.yimg.com',
    'zenfs.com'
  ];

  const targets = products.filter(p => {
    const url = p.imageUrl || '';
    const isSuspicious = wrongImagePatterns.some(pat => url.includes(pat)) || url === '';
    
    // Ensure it matches recently added categories/brands to narrow down targets
    const n = p.name.toLowerCase();
    const isRecent = (
      n.includes("dettol") || n.includes("detol") ||
      n.includes("ruchi") || n.includes("krati") || n.includes("kriti") ||
      n.includes("chhola") || n.includes("moong") || n.includes("rava") ||
      n.includes("kolam") || n.includes("everest") || n.includes("jeeravan") ||
      n.includes("tan man") || n.includes("tide") || n.includes("surf excel") ||
      n.includes("ghadi") || n.includes("rin") ||
      n.includes("catch") || n.includes("pushp") ||
      n.includes("agarbatti") || n.includes("cookie") || n.includes("shringar") ||
      n.includes("basant bahar") || n.includes("d-dark") || n.includes("indulekha")
    );

    return isSuspicious && isRecent;
  });

  console.log(`Found ${targets.length} products needing image refinement.`);
  
  if (DRY_RUN) {
    console.log('⚠️ Running in DRY RUN mode. No database changes will be saved.');
  } else {
    console.log('🔥 Running in WRITE mode. Database changes WILL be saved!');
  }
  
  const results = [];
  
  // We will process a subset first for testing if DRY_RUN is true
  const limit = DRY_RUN ? 3 : targets.length;
  const toProcess = targets.slice(0, limit);
  
  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    try {
      const res = await refineProductImage(p, i + 1, toProcess.length);
      if (res) {
        results.push(res);
        
        if (!DRY_RUN) {
          console.log(`   ✍️ Updating Firestore document products/${p.id}...`);
          await updateDoc(doc(db, "products", p.id), {
            imageUrl: res.newImageUrl
          });
          
          // Also update globalCatalog
          let globalId = p.globalCatalogId;
          if (!globalId) {
            // Find in globalCatalog by name
            const globalQuery = query(collection(db, "globalCatalog"), where("name", "==", p.name));
            const globalSnap = await getDocs(globalQuery);
            if (!globalSnap.empty) {
              globalId = globalSnap.docs[0].id;
            }
          }
          
          if (globalId) {
            console.log(`   ✍️ Updating globalCatalog document globalCatalog/${globalId}...`);
            await updateDoc(doc(db, "globalCatalog", globalId), {
              imageUrl: res.newImageUrl
            });
          } else {
            console.log(`   ℹ️ No globalCatalog match found to update.`);
          }
        }
      }
    } catch (err) {
      console.error(`   ❌ Error processing product ${p.name}:`, err.message);
    }
    
    if (i < toProcess.length - 1) {
      console.log(`   Sleeping for ${DELAY_MS}ms...`);
      await sleep(DELAY_MS);
    }
  }

  console.log('\n--- Processing Summary ---');
  console.log(`Total target products: ${toProcess.length}`);
  console.log(`Successfully refined: ${results.length}`);
  results.forEach((r, i) => {
    console.log(`${i + 1}. "${r.productName}" -> ${r.newImageUrl}`);
  });

  process.exit(0);
}

main().catch(console.error);
