import https from 'https';
import http from 'http';

function fetchSafe(url, timeoutMs = 10000) {
  return new Promise(resolve => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    fetch(url, { signal: controller.signal })
      .then(r => { clearTimeout(timer); resolve(r); })
      .catch(() => { clearTimeout(timer); resolve(null); });
  });
}

async function searchDuckDuckGo(query) {
  const initUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
  const initRes = await fetchSafe(initUrl, 10000);
  if (!initRes || !initRes.ok) return null;
  const html = await initRes.text();
  const vqdMatch = html.match(/vqd=['"]([^'"]+)['"]/);
  if (!vqdMatch) return null;
  const vqd = vqdMatch[1];
  console.log("Got vqd:", vqd);

  const imgUrl = `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,,,&p=1&v7exp=a`;
  const imgRes = await fetchSafe(imgUrl, 10000);
  if (!imgRes || !imgRes.ok) return null;
  try {
    const data = await imgRes.json();
    return data.results.slice(0, 3).map(r => r.image);
  } catch { return null; }
}

searchDuckDuckGo("Colgate Strong Teeth 100g product").then(console.log);
