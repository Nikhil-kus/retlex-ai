const res = await fetch("https://www.bing.com/images/search?q=Patanjali+Cow+Ghee+product+India+packaging&form=HDRSC2&first=1", {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
  }
});
console.log("Status:", res.status);
const html = await res.text();
const murls = [...html.matchAll(/"murl":"(https?:[^"]+\.(?:jpg|jpeg|png))"/gi)];
console.log("murl count:", murls.length);
if (murls.length > 0) {
  console.log("First murl:", decodeURIComponent(murls[0][1]).slice(0, 100));
}
// Also test OFF
const off = await fetch("https://world.openfoodfacts.org/cgi/search.pl?search_terms=Patanjali+Ghee&search_simple=1&action=process&json=1&page_size=3&fields=product_name,image_front_url");
console.log("OFF status:", off.status);
const offData = await off.json();
console.log("OFF products:", offData.products?.length);
if (offData.products?.[0]?.image_front_url) console.log("OFF image:", offData.products[0].image_front_url.slice(0,80));
