'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowDown, ArrowRight, Check, ChevronRight, MapPin, Mic, Search, ShoppingBag, Sparkles, Star, Store, X } from 'lucide-react';
import styles from './discover.module.css';

type Mode = 'shirts' | 'groceries';
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: ((event: { error: string }) => void) | null; onend: (() => void) | null; start: () => void; abort: () => void };
type VoiceWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
const examples = ['White shirt near me in lowest price', 'Fresh milk and brown bread near me'];
const shopPhotos = {
  shirts: ['/discover/shop-fashion-1.webp', '/discover/shop-fashion-2.webp', '/discover/shop-fashion-3.jpg'],
  groceries: ['/discover/shop-grocery-1.jpeg', '/discover/shop-grocery-2.webp', '/discover/shop-grocery-3.jpg'],
};
const shops = {
  shirts: [
    { name: 'The Cotton House', id: 'RTL-F1042', street: 'Market Road', distance: 0.4, rating: '4.8', subtitle: 'Everyday essentials. Thoughtfully priced.', color: '#d5dac8' },
    { name: 'Urban Thread', id: 'RTL-F2086', street: 'High Street', distance: 0.8, rating: '4.7', subtitle: 'Your next favourite fit is right here.', color: '#ead9c8' },
    { name: 'Everyday Menswear', id: 'RTL-F3015', street: 'Station Road', distance: 1.2, rating: '4.6', subtitle: 'Classic styles from your local store.', color: '#d6dce4' },
  ],
  groceries: [
    { name: 'Sharma Fresh Mart', id: 'RTL-G1028', street: 'Market Road', distance: 0.3, rating: '4.9', subtitle: 'Fresh mornings start in your neighbourhood.', color: '#d5dac8' },
    { name: 'Daily Basket', id: 'RTL-G2041', street: 'High Street', distance: 0.6, rating: '4.7', subtitle: 'A little bit of everything, close to home.', color: '#ead9c8' },
    { name: 'Gupta General Store', id: 'RTL-G3063', street: 'Station Road', distance: 1.1, rating: '4.8', subtitle: 'Your friendly neighbourhood essentials.', color: '#d6dce4' },
  ],
};
const shirts = [
  { name: 'Everyday cotton shirt', detail: 'Regular fit · S, M, L, XL', price: 399, old: 599, shop: 0, image: '/discover/shirt-cotton.jpg' },
  { name: 'Classic Oxford shirt', detail: 'Regular fit · M, L, XL', price: 549, old: 799, shop: 2, image: '/discover/shirt-oxford.jpg' },
  { name: 'Essential white shirt', detail: 'Slim fit · S, M, L', price: 599, old: 899, shop: 1, image: '/discover/shirt-essential.jpg' },
  { name: 'Soft cotton casual shirt', detail: 'Relaxed fit · M, L, XL', price: 649, old: 899, shop: 0, image: '/discover/shirt-casual.jpg' },
  { name: 'Textured white shirt', detail: 'Regular fit · S, M, L', price: 749, old: 999, shop: 2, image: '/discover/shirt-textured.jpg' },
  { name: 'Premium linen blend', detail: 'Relaxed fit · M, L, XL', price: 899, old: 1299, shop: 1, image: '/discover/shirt-premium.jpg' },
];
const groceries = [
  { name: 'Amul Taaza milk', detail: 'Fresh toned milk · 500 ml', price: 28, old: 28, kind: 'milk', brand: 'Amul', image: '/discover/amul.jpg' },
  { name: 'Sanchi Taaza milk', detail: 'Fresh toned milk · 500 ml', price: 27, old: 28, kind: 'milk', brand: 'Sanchi', image: '/discover/sanchi.jpg' },
  { name: 'Brown bread', detail: 'Whole wheat · 200 g pack', price: 25, old: 30, kind: 'bread', brand: 'Britannia', image: '/discover/bread-200.png' },
  { name: 'Brown bread', detail: 'Whole wheat · 400 g pack', price: 45, old: 50, kind: 'bread', brand: 'Britannia', image: '/discover/bread-400.png' },
];

function Photo({ src, alt, shop = false }: { src: string; alt: string; shop?: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed ? <div className={styles.photoFallback}><ShoppingBag size={30} /><span>Photo unavailable</span></div> :
    <Image src={src} alt={alt} fill sizes={shop ? '(max-width: 540px) 40vw, 33vw' : '(max-width: 800px) 50vw, 25vw'} className={shop ? styles.shopPhoto : styles.productPhoto} onError={() => setFailed(true)} />;
}

function Rating({ value }: { value: string }) {
  return <div className={styles.rating} aria-label={`Rated ${value} out of 5, demo rating`}><span>{value}</span><span className={styles.stars} aria-hidden="true">{[0, 1, 2, 3, 4].map(star => <Star key={star} size={14} fill={star < 4 ? 'currentColor' : 'none'} />)}</span><span className={styles.ratingLabel}>Demo rating</span></div>;
}

export default function Discover() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('Demo neighbourhood');
  const recognition = useRef<Recognition | null>(null);
  const results = useRef<HTMLElement | null>(null);
  useEffect(() => () => { recognition.current?.abort(); }, []);

  function search(value: string) {
    recognition.current?.abort();
    setListening(false);
    setQuery(value);
    const normalized = value.toLowerCase();
    const next = /white/.test(normalized) && /shirt/.test(normalized) ? 'shirts' : /milk/.test(normalized) && /brown\s*bread/.test(normalized) ? 'groceries' : null;
    setMode(next);
    setSelected(null);
    setMessage(next ? '' : 'This preview supports two searches. Try white shirts, or fresh milk and brown bread, using the examples below.');
    if (next) window.setTimeout(() => results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }
  function listen() {
    if (listening) { recognition.current?.abort(); setListening(false); return; }
    const Constructor = (window as VoiceWindow).SpeechRecognition || (window as VoiceWindow).webkitSpeechRecognition;
    if (!Constructor) { setMessage('Voice search is not supported in this browser. Type your search or tap an example below.'); return; }
    recognition.current?.abort();
    const voice = new Constructor();
    recognition.current = voice;
    voice.lang = 'en-IN'; voice.continuous = false; voice.interimResults = false;
    voice.onresult = event => search(Array.from(event.results).map(result => result[0].transcript).join(' '));
    voice.onerror = event => { if (event.error === 'aborted') return; setListening(false); setMessage(event.error === 'not-allowed' ? 'Microphone access was denied. Allow it in your browser, or tap an example to continue.' : 'Could not hear your search. Please try again, type it, or tap an example.'); };
    voice.onend = () => setListening(false);
    setMessage(''); setListening(true);
    try { voice.start(); } catch { setListening(false); setMessage('Microphone could not start. Please use an example or type your search.'); }
  }
  function locate() {
    if (!navigator.geolocation) { setMessage('Location is unavailable. You can continue with the demo neighbourhood.'); return; }
    setLocation('Locating…');
    navigator.geolocation.getCurrentPosition(() => { setLocation('Current location enabled'); setMessage('Location received. Shops, stock and distances remain simulated for this preview.'); }, () => { setLocation('Demo neighbourhood'); setMessage('Location access is unavailable. Showing the demo neighbourhood.'); }, { timeout: 10000 });
  }
  const activeShops = shops[mode || 'shirts'];
  return <div className={styles.page}>
    <header className={styles.header}><Link href="/discover" className={styles.logo} aria-label="Retlex discover"><span><ShoppingBag size={22} /></span>retlex<span className={styles.dot}>.</span></Link><div className={styles.navLabel}>A world of local possibilities</div><button onClick={locate} className={styles.location}><MapPin size={16} /><span>{location}</span><ChevronRight size={14} /></button></header>
    <main>
      <section className={styles.hero}>
        <div className={styles.eyebrow}><span /> YOUR NEIGHBOURHOOD. DISCOVERED.</div>
        <h1>What you need.<br /><span>Closer than you think.</span></h1>
        <p>From a fresh start to the perfect fit. Discover what’s available<br className={styles.desktopBreak} /> in shops around you, before you step out.</p>
        <form className={`${styles.search} ${listening ? styles.listening : ''}`} onSubmit={event => { event.preventDefault(); search(query); }}><Search size={22} /><input aria-label="Find products nearby" placeholder="Tell us what you’re looking for…" value={query} onChange={event => setQuery(event.target.value)} /><button type="button" className={styles.mic} aria-label={listening ? 'Stop listening' : 'Speak your search'} aria-pressed={listening} onClick={listen}>{listening ? <X size={21} /> : <Mic size={21} />}</button><button className={styles.searchButton} type="submit">Find nearby <ArrowRight size={18} /></button></form>
        <div className={styles.voiceHint} aria-live="polite">{listening ? <><span className={styles.wave}>▂ ▅ ▇ ▃ ▆ ▂</span> Listening… say one of the searches below</> : <><Mic size={13} /> Just say it. We’ll find it.</>}</div>
        <div className={styles.examples}><span>TRY ASKING</span>{examples.map((example, index) => <button key={example} onClick={() => search(example)}>{index === 0 ? '“White shirt near me in lowest price”' : '“Fresh milk and brown bread near me”'}<ArrowRight size={14} /></button>)}</div>
        {message && <p className={styles.message} role="status">{message}</p>}
        <div className={styles.trust}><span><Check size={15} /> See availability</span><span><MapPin size={15} /> Shop closer</span><span><Sparkles size={15} /> Find better prices</span></div>
        <div className={styles.demoLabel}>INTERACTIVE CONCEPT DEMO <span>•</span> Sample shops, ratings, prices, stock & distances</div>
      </section>
      {mode ? <section ref={results} className={styles.results} aria-label="Search results">
        <div className={styles.sectionHeading}><div><div className={styles.eyebrow}>GOOD FINDS, JUST AROUND THE CORNER</div><h2>{mode === 'shirts' ? 'Your perfect white shirt is nearby.' : 'Your morning essentials, sorted.'}</h2><p>3 nearby shops with {mode === 'shirts' ? 'white shirts' : 'milk & brown bread'} in demo stock</p></div><span className={styles.resultBadge}><span /> Available in demo</span></div>
        <div className={styles.shopGrid}>{activeShops.map((shop, index) => <button key={shop.id} className={`${styles.shopCard} ${selected === index ? styles.selected : ''}`} onClick={() => setSelected(selected === index ? null : index)} aria-pressed={selected === index}>
          <div className={styles.storeArt}><Photo src={shopPhotos[mode][index]} alt={`Representative Indian ${mode === 'shirts' ? 'clothing' : 'kirana'} shop storefront`} shop /><span className={styles.open}>● Open now</span><span className={styles.photoLabel}>Representative photo</span></div>
          <div className={styles.shopInfo}>
            <span className={styles.shopCategory}>{mode === 'shirts' ? 'Clothing & everyday fashion' : 'Groceries & daily essentials'}</span>
            <div className={styles.shopTitle}><h3>{shop.name}</h3></div>
            <Rating value={shop.rating} />
            <p><MapPin size={14} /><strong>{shop.distance} km away</strong> · {shop.street}</p>
            <div className={styles.shopAvailability}><Check size={14} />{mode === 'shirts' ? '2 white shirts available' : 'Milk & both bread sizes available'}</div>
            <div className={styles.shopId}>SHOP ID · {shop.id}</div>
            <div className={styles.shopBottom}><span>{mode === 'shirts' ? `From ₹${Math.min(...shirts.filter(product => product.shop === index).map(product => product.price))}` : '4 matching products'}</span><span className={styles.shopCta}>{selected === index ? 'Selected shop' : 'View products'} <ArrowRight size={14} /></span></div>
          </div>
        </button>)}</div>
        <p className={styles.photoNote}>Real photos for illustration. Shop identities, ratings, inventory and distances are simulated for this demo.</p>
        {mode === 'groceries' && selected === null ? <div className={styles.selectPrompt}><Store size={25} /><div><h3>A fresh find is one tap away.</h3><p>Choose a shop above to see Amul milk, Sanchi milk and both brown bread pack sizes.</p></div><ArrowDown size={20} /></div> : <div className={styles.products}>
          <div className={styles.sectionHeading}><div><h2>{selected !== null ? `Available at ${activeShops[selected].name}` : 'White shirts. Small prices.'}</h2><p>{selected !== null ? activeShops[selected].subtitle : 'All matching products across all 3 shops, from lowest price to highest.'}</p></div><button className={styles.sort} onClick={() => setSelected(null)}>{selected !== null ? 'Show all shops' : 'Price: low to high'} {selected !== null ? <X size={14} /> : <Check size={14} />}</button></div>
          <div className={styles.productGrid}>{(mode === 'shirts' ? shirts.filter(product => selected === null || product.shop === selected).map(product => ({ ...product, kind: 'shirt', brand: 'White shirt collection' })) : groceries.map(product => ({ ...product, shop: selected ?? 0 }))).map((product, index) => <article key={`${product.name}-${product.detail}`} className={styles.productCard}>
            <div className={styles.productArt}>
              <Photo src={product.image} alt={`${product.brand} ${product.name} — ${product.detail}; representative product photo`} />
              {mode === 'shirts' && product.price === 399 && <span className={styles.best}>Lowest price nearby</span>}
            </div>
            <div className={styles.productInfo}>
              <span className={styles.productCategory}>{product.brand}</span>
              <h3>{product.name}</h3><p>{product.detail}</p>
              <Rating value={mode === 'shirts' ? '4.5' : '4.7'} />
              {product.old > product.price && <span className={styles.deal}>{Math.round((1 - product.price / product.old) * 100)}% off <span>Local shop price</span></span>}
              <div className={styles.price}><span>₹</span>{product.price}<sup>00</sup></div>
              <div className={styles.mrp}>{product.old > product.price ? <>M.R.P.: <del>₹{product.old}</del> <span>Save ₹{product.old - product.price}</span></> : 'Inclusive of all taxes'}</div>
              <div className={styles.stock}><Check size={13} />In stock · {mode === 'shirts' ? 3 + shirts.findIndex(item => item.name === product.name) : 12 + index * 3} available</div>
              <div className={styles.productShop}><Store size={13} />{activeShops[product.shop].name}</div>
              <div className={styles.distance}><MapPin size={13} /><strong>{activeShops[product.shop].distance} km</strong> from you <span>· Demo</span></div>
              <button className={styles.productCta} onClick={() => { setSelected(product.shop); results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>View shop <ArrowRight size={14} /></button>
            </div>
          </article>)}</div>
        </div>}
      </section> : <section className={styles.intro}><div className={styles.introTitle}><span>LESS SEARCHING. MORE FINDING.</span><h2>The high street,<br />now at your fingertips.</h2><p>One simple search. A whole neighbourhood of possibilities.</p></div><div className={styles.steps}>{[{ icon: Mic, title: 'Say what you need', text: 'Ask naturally, just like you would a friend.' }, { icon: MapPin, title: 'Find it around you', text: 'Discover local shops with what you’re looking for.' }, { icon: ShoppingBag, title: 'Know before you go', text: 'Compare prices, check stock and pick your shop.' }].map((step, index) => <div key={step.title}><span className={styles.stepIcon}><step.icon size={21} /></span><small>0{index + 1}</small><h3>{step.title}</h3><p>{step.text}</p></div>)}</div></section>}
      <section className={styles.owner}><div><div className={styles.eyebrow}>LOCAL DISCOVERY MEETS LOCAL BUSINESS</div><h2>Great for you.<br />Powerful for your local shop.</h2><p>Behind every great find is a shop ready to serve you.<br />Explore the Retlex experience built for shop owners.</p><Link href="/" className={styles.ownerButton}>See how shops work <ArrowRight size={18} /></Link></div><div className={styles.ownerVisual}><div className={styles.ownerIcon}><Store size={36} /></div><h3>The local shop.<br />A little more connected.</h3><div><span><Check size={14} /> Inventory</span><span><Check size={14} /> Billing</span><span><Check size={14} /> Business insights</span></div></div></section>
    </main><footer className={styles.footer}><span className={styles.footerBrand}>retlex.</span><span>A closer connection to your neighbourhood.</span><small>Concept preview · Sample inventory, no live purchases</small></footer>
  </div>;
}

