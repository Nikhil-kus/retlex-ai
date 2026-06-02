import fs from 'fs';
import path from 'path';

const catalogPath = 'src/lib/kirana-catalog.ts';
let content = fs.readFileSync(catalogPath, 'utf8');

// Category mapping for static file based on comments
const getCategory = (name, index, fullContent) => {
    const lines = fullContent.split('\n');
    let currentCat = '';
    let currentPos = 0;
    for (const line of lines) {
        if (line.includes('// ======')) {
            currentCat = line.split('======')[1].trim();
        }
        const lineStart = content.indexOf(line, currentPos);
        if (lineStart > index) break;
        currentPos = lineStart + line.length;
    }
    return currentCat;
};

// Regex to find each product object
const regex = /({ name: "([^"]+)",\s*localName:\s*"([^"]*)",[^}]+)(})/g;
let matches = [...content.matchAll(regex)];

for (const match of matches) {
    const fullMatch = match[0];
    const prefix = match[1];
    const name = match[2];
    const localName = match[3];
    const index = match.index;
    
    const category = getCategory(name, index, content);
    
    // Target categories in the static file
    const isTarget = category === "OIL / SALT / SUGAR" || 
                     category === "INSTANT FOODS & NOODLES" || 
                     name.toLowerCase().includes("agarbatti") || 
                     name.toLowerCase().includes("dhoop");

    if (!isTarget) continue;

    const nameLower = name.toLowerCase();
    const isLoose = nameLower.includes('loose') || localName.includes('खुला') || (fullMatch.includes('unit: "kg"') && !nameLower.match(/5kg|10kg|1kg/));
    
    let searchQuery = name + " grocery product india";
    
    if (nameLower.includes("agarbatti") || nameLower.includes("dhoop")) {
        searchQuery = name + " agarbatti incense india";
    } else if (category === "OIL / SALT / SUGAR") {
        if (nameLower.includes("oil") || nameLower.includes("ghee") || nameLower.includes("tel")) {
            searchQuery = name + " cooking oil ghee india";
            if (isLoose) {
                searchQuery = name.replace(/loose/i, '').trim() + " cooking oil in bowl raw";
            }
        }
    } else if (category === "INSTANT FOODS & NOODLES") {
        searchQuery = name + " instant food grocery product india";
        if (isLoose) {
            searchQuery = name.replace(/loose/i, '').trim() + " heap isolated on white background without packet";
        }
    }

    const encodedName = encodeURIComponent(searchQuery);
    const imgUrl = `https://tse1.mm.bing.net/th?q=${encodedName}`;
    
    // Replace imageUrl
    let newPrefix = prefix.replace(/,\s*imageUrl:\s*"[^"]*"/, '');
    const newEntry = `${newPrefix}, imageUrl: "${imgUrl}" }`;
    content = content.replace(fullMatch, newEntry);
}

fs.writeFileSync(catalogPath, content);
console.log('Static catalog updated successfully!');
