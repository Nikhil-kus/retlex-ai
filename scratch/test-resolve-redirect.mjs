import https from 'https';

function resolveRedirect(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // The redirect should have a location header or we can get it from response headers
      console.log('Status Code:', res.statusCode);
      console.log('Headers:', res.headers);
      if (res.headers.location) {
        resolve(res.headers.location);
      } else {
        // If it's a 200 OK, maybe it does a client-side redirect or it's just the page. Let's check body
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          // Look for any window.location or href in the HTML
          const metaMatch = data.match(/<meta[^>]+http-equiv="refresh"[^>]+url=([^"]+)"/i);
          if (metaMatch) {
            resolve(metaMatch[1]);
          } else {
            resolve(null);
          }
        });
      }
    }).on('error', reject);
  });
}

const redirectUrl = 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGeZ-ETIyqbPXYpPx-ClcUFO7QaCUiUGA827spsV362l8Svy_6iYECqYs3TGu_y1a1BTAc2e9rwbRdmUETuuy1p8r2k4kfYPjvdv86sBCpB5ZYrSZRYgT7IW3fpaqVR15cGEPidkirY73ULSSebAY0qz-WjlqeJT16qNO81AlJPoweWdAHWrimf_qgSlc6uQpRy';

resolveRedirect(redirectUrl)
  .then(dest => console.log('Destination:', dest))
  .catch(console.error);
