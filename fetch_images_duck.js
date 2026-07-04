const { searchImages } = require('duck-duck-scrape');

const queries = {
  'Household Essentials': 'All Out Mosquito Repellent machine transparent png',
  'Laundry': 'Surf Excel Easy Wash packet transparent png',
  'Moisturisers': 'Vaseline Intensive Care Lotion bottle transparent png',
  'Oral Care': 'Colgate Strong Teeth Toothpaste transparent png',
  'Personal Care': 'Himalaya Purifying Neem Face Wash transparent png',
  'Shampoo': 'Clinic Plus Shampoo bottle transparent png',
  'Handwash': 'Dettol Liquid Handwash transparent png',
  'Pooja Items': 'Mangaldeep Agarbatti packet transparent png'
};

async function run() {
  for (const cat of Object.keys(queries)) {
    const query = queries[cat];
    try {
      const results = await searchImages(query, { moderate: true });
      if (results.results && results.results.length > 0) {
        console.log(`  '${cat}': '${results.results[0].image}',`);
      } else {
        console.log(`  '${cat}': '', // Not found: ${query}`);
      }
    } catch(e) {
      console.log(`  '${cat}': '', // Error: ${query}`);
    }
  }
}
run();
