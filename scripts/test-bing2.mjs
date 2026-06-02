const res = await fetch("https://www.bing.com/images/search?q=Patanjali+Cow+Ghee+product+India&form=HDRSC2&first=1", {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
  }
});
const html = await res.text();
// Try different patterns Bing uses
const patterns = [
  { name: "murl",  re: /"murl":"(https?:[^"]+\.(?:jpg|jpeg|png))"/gi },
  { name: "iurl",  re: /"iurl":"(https?:[^"]+\.(?:jpg|jpeg|png))"/gi },
  { name: "imgurl",re: /"imgurl":"(https?:[^"]+\.(?:jpg|jpeg|png))"/gi },
  { name: "src=",  re: /src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png))"/gi },
  { name: "mediaurl", re: /"mediaurl":"(https?:[^"]+\.(?:jpg|jpeg|png))"/gi },
];
for (const p of patterns) {
  const m = [...html.matchAll(p.re)];
  console.log(p.name + ":", m.length, m.length > 0 ? decodeURIComponent(m[0][1]).slice(0,80) : "");
}
// Show a snippet of the raw HTML around image data
const idx = html.indexOf('"imgurl"');
if (idx > -1) console.log("\nSnippet around imgurl:", html.slice(idx, idx+200));
const idx2 = html.indexOf('"murl"');
if (idx2 > -1) console.log("\nSnippet around murl:", html.slice(idx2, idx2+200));
const idx3 = html.indexOf('"iurl"');
if (idx3 > -1) console.log("\nSnippet around iurl:", html.slice(idx3, idx3+200));
