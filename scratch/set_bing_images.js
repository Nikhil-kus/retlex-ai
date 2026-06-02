const fs = require('fs');

async function updateCatalog() {
  const catalogPath = 'src/lib/kirana-catalog.ts';
  let content = fs.readFileSync(catalogPath, 'utf8');
  
  // Regex to find each product object
  const regex = /({ name: "([^"]+)",([^}]+))(})/g;
  let matches = [...content.matchAll(regex)];
  
  for (const match of matches) {
    const fullMatch = match[0];
    const prefix = match[1];
    const name = match[2];
    
    // Remove existing imageUrl if any
    let cleanedPrefix = prefix.replace(/,\s*imageUrl:\s*"[^"]*"/, '');
    
    // Create new imageUrl using Bing Thumbnail API
    const encodedName = encodeURIComponent(name + " grocery india");
    const imgUrl = `https://tse1.mm.bing.net/th?q=${encodedName}`;
    
    const newEntry = `${cleanedPrefix}, imageUrl: "${imgUrl}" }`;
    content = content.replace(fullMatch, newEntry);
  }
  
  fs.writeFileSync(catalogPath, content);
  console.log('Catalog updated successfully with Bing dynamic thumbnails!');
}

updateCatalog().catch(console.error);
