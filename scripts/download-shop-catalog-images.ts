/** Run with node --import tsx scripts/download-shop-catalog-images.ts */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { PHOTO_SEEDS } from '../src/lib/starter-catalog';

async function main() {
const output = path.resolve('public/catalog-images');
await mkdir(output, { recursive: true });
const creditsPath = path.join(output, 'credits.json');
type Credit = { author: string; license: string; licenseUrl: string; sourceUrl: string; search: string; title: string };
const credits: Record<string, Credit> = JSON.parse(await readFile(creditsPath, 'utf8').catch(() => '{}'));
const strip = (value = '') => value.replace(/<[^>]*>/g, '').replace(/&#\d+;/g, '').trim();
const failures: string[] = [];
const overrides: Record<string, string> = {
  'tent-marquee.jpg': 'intitle:marquee tent -Washington -Burk',
  'tent-folding-table.jpg': 'intitle:"folding table" -MET',
  'tent-mattress.jpg': 'intitle:mattress -painting -Michelena -Miranda',
  'tent-cushion.jpg': 'intitle:cushion -donut -plant -flower -cactus',
  'tent-steel-plate.jpg': 'intitle:"stainless steel" plate',
  'electronics-socket.jpg': 'intitle:socket electrical -railway -CPU',
  'electronics-wire.jpg': 'intitle:wire coil -Tesla -diagram -Kennedy',
};
const exactTitles: Record<string, string> = {
  'tent-marquee.jpg': 'File:Marquee tents.png',
  'tent-folding-table.jpg': 'File:Folding table.jpg',
  'tent-mattress.jpg': 'File:Mattress(made up of silk cotton-capok-Kapok)salem Wiki DEC2011-Tamil Nadu595.jpg',
  'tent-cushion.jpg': 'File:Cushion.jpg',
  'tent-chafing-dish.jpg': 'File:Chafingdish.jpg',
  'tent-steel-plate.jpg': 'File:Empty Indian Thali Plate.jpeg',
  'electronics-power-bank.jpg': 'File:IMG of power bank.jpg',
  'electronics-wire.jpg': 'File:ElectricWireOnReel.JPG',
  'electronics-switch.jpg': 'File:White light switch.jpg',
  'electronics-led-bulb.jpg': 'File:Philips LED bulb.jpg',
  'universal-paper-bag.jpg': 'File:Two paper bags.jpg',
  'universal-bucket.jpg': 'File:Purple plastic bucket.jpg',
  'universal-pen.jpg': 'File:Bic Stic Photo.jpg',
  'universal-notebook.jpg': 'File:Cuadernos de la Marca Campus (51005627660).jpg',
};
if (process.argv.includes('--candidates')) {
  for (const search of ['electrical cable roll', 'steel thali empty', 'marquee tent white', 'ballpoint pen isolated', 'notebook stationery']) {
    const params = new URLSearchParams({ action: 'query', list: 'search', srsearch: `${search} filetype:bitmap`, srnamespace: '6', srlimit: '10', format: 'json' });
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
    console.log(search, JSON.stringify((await response.json()).query?.search?.map((p: { title: string }) => p.title)));
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return;
}
for (const [scope, seeds] of Object.entries(PHOTO_SEEDS)) {
  for (const [slug, , , , , search] of seeds) {
    const filename = `${scope}-${slug}.jpg`;
    if (credits[filename] && (exactTitles[filename] ? credits[filename].title === exactTitles[filename] : !overrides[filename] || credits[filename].search === overrides[filename]) && await readFile(path.join(output, filename)).then(() => true, () => false)) continue;
    try {
      await new Promise(resolve => setTimeout(resolve, 1800));
      const searchTerm = overrides[filename] || search;
      const params = new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: `${searchTerm} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '5', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '480', format: 'json' });
      if (exactTitles[filename]) {
        for (const key of ['generator', 'gsrsearch', 'gsrnamespace', 'gsrlimit']) params.delete(key);
        params.set('titles', exactTitles[filename]);
      }
      let response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { signal: AbortSignal.timeout(30000) });
      for (let attempt = 0; response.status === 429 && attempt < 3; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 15000));
        response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { signal: AbortSignal.timeout(30000) });
      }
      if (!response.ok) throw new Error(`Search HTTP ${response.status}`);
      const data = await response.json();
      const pages = Object.values(data.query?.pages || {}).sort((a: any, b: any) => a.index - b.index) as any[];
      let saved = false;
      for (const page of pages) {
        const info = page.imageinfo?.[0];
        const meta = info?.extmetadata;
        const license = strip(meta?.LicenseShortName?.value);
        if (!info || !/CC BY|CC0|Public domain/i.test(license)) continue;
        const photo = await fetch(info.thumburl || info.url, { signal: AbortSignal.timeout(30000) });
        if (!photo.ok || !photo.headers.get('content-type')?.startsWith('image/')) continue;
        const bytes = await photo.arrayBuffer();
        await sharp(Buffer.from(bytes)).rotate().resize(480, 480, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(path.join(output, filename));
        credits[filename] = { author: strip(meta?.Artist?.value) || 'Wikimedia Commons contributor', license, licenseUrl: meta?.LicenseUrl?.value || 'https://commons.wikimedia.org/wiki/Commons:Licensing', sourceUrl: info.descriptionurl, search: searchTerm, title: page.title };
        await writeFile(creditsPath, JSON.stringify(credits, null, 2) + '\n');
        console.log(`${filename}: ${page.title} (${license})`);
        saved = true;
        break;
      }
      if (!saved) throw new Error('No downloadable freely licensed image found');
    } catch (error) {
      failures.push(filename);
      console.error(`${filename}: ${error instanceof Error ? error.message : error}`);
    }
  }
}
if (failures.length) { console.error('Missing photos:', failures.join(', ')); process.exitCode = 1; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
