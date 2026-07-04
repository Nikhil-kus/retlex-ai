import { searchImages } from 'duck-duck-scrape';

async function run() {
  const q1 = "Patanjali Kesh Kanti Natural Hair Cleanser 200ml";
  const q2 = "Kamal kishore tambaku packet 5 rs";

  console.log("Searching for:", q1);
  const r1 = await searchImages(q1, { moderate: true });
  r1.results.slice(0, 3).forEach(img => console.log(img.image));

  console.log("\nSearching for:", q2);
  const r2 = await searchImages(q2, { moderate: true });
  r2.results.slice(0, 3).forEach(img => console.log(img.image));
}
run();
