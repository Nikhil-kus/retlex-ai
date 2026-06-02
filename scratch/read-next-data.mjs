import fs from 'fs';

const html = fs.readFileSync('scratch/everest_res.html', 'utf-8');

const regex = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/gi;
const match = regex.exec(html);
if (match) {
  const jsonStr = match[1];
  console.log('__NEXT_DATA__ Length:', jsonStr.length);
  fs.writeFileSync('scratch/next_data.json', jsonStr);
  try {
    const data = JSON.parse(jsonStr);
    console.log('Parsed successfully!');
    // Print top-level keys
    console.log('Keys:', Object.keys(data));
    console.log('Props:', Object.keys(data.props || {}));
    if (data.props && data.props.pageProps) {
      console.log('pageProps Keys:', Object.keys(data.props.pageProps));
      fs.writeFileSync('scratch/page_props.json', JSON.stringify(data.props.pageProps, null, 2));
      console.log('Saved pageProps to scratch/page_props.json');
    }
  } catch (e) {
    console.log('JSON Parse failed:', e.message);
  }
} else {
  console.log('__NEXT_DATA__ script not found!');
}
