// Test DuckDuckGo image search — still embeds image URLs in HTML
const res = await fetch("https://duckduckgo.com/?q=Patanjali+Cow+Ghee+product+India&iax=images&ia=images", {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,*/*",
  }
});
console.log("DDG status:", res.status);
const html = await res.text();
// DDG embeds a vqd token needed for the actual image API
const vqd = html.match(/vqd=([\d-]+)/)?.[1];
console.log("vqd:", vqd);
if (vqd) {
  const imgRes = await fetch("https://duckduckgo.com/i.js?q=Patanjali+Cow+Ghee+product+India&vqd=" + vqd + "&f=,,,,,&p=1", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Referer": "https://duckduckgo.com/",
    }
  });
  console.log("DDG img API status:", imgRes.status);
  const data = await imgRes.json();
  console.log("Results:", data.results?.length);
  if (data.results?.[0]) {
    console.log("First image:", data.results[0].image?.slice(0,100));
  }
}
