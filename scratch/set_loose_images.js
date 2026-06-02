const fs = require('fs');

async function updateCatalog() {
  const catalogPath = 'src/lib/kirana-catalog.ts';
  let content = fs.readFileSync(catalogPath, 'utf8');
  
  // Regex to find each product object
  const regex = /({ name: "([^"]+)",\s*localName:\s*"([^"]*)",[^}]+)(})/g;
  let matches = [...content.matchAll(regex)];
  
  for (const match of matches) {
    const fullMatch = match[0];
    const prefix = match[1];
    const name = match[2];
    const localName = match[3];
    
    // Remove existing imageUrl if any
    let cleanedPrefix = prefix.replace(/,\s*imageUrl:\s*"[^"]*"/, '');
    
    const nameLower = name.toLowerCase();
    const isLoose = nameLower.includes('loose') || localName.includes('खुला') || (!nameLower.match(/5kg|10kg|1kg/) && fullMatch.includes('unit: "kg"'));
    
    let searchQuery = name + " grocery product india";
    if (isLoose) {
      searchQuery = name.replace(/loose/i, '').trim() + " loose in a bowl raw unbranded";
    }

    const encodedName = encodeURIComponent(searchQuery);
    const imgUrl = `https://tse1.mm.bing.net/th?q=${encodedName}`;
    
    const newEntry = `${cleanedPrefix}, imageUrl: "${imgUrl}" }`;
    content = content.replace(fullMatch, newEntry);
  }
  
  fs.writeFileSync(catalogPath, content);
  console.log('Catalog updated successfully with loose product logic!');
}

updateCatalog().catch(console.error);
