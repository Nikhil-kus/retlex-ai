const fs = require('fs');

const path = 'krishna-products-catalog.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

let updated = 0;
data.forEach(p => {
  if (p.id === '0yK2Jp8VQnxF71meTGNm') {
    p.imageUrl = "https://www.bigbasket.com/media/uploads/p/l/40003058_13-patanjali-kesh-kanti-natural-hair-cleanser.jpg";
    updated++;
  }
  if (p.id === 'EloQwHnLTa0Rk1nIkMYb') {
    p.imageUrl = "https://5.imimg.com/data5/SELLER/Default/2021/6/RD/FR/AD/6513364/kamal-pasand-tobacco-500x500.jpeg";
    updated++;
  }
});

if (updated > 0) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(`Updated ${updated} items in JSON.`);
} else {
  console.log("No items found to update in JSON.");
}
