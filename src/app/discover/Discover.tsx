'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight, ArrowUpRight, AudioLines, Check, ChevronDown, ChevronRight,
  Database, MapPin, Menu, Mic, Package, Search, Shirt, ShoppingBag, X,
} from 'lucide-react';
import { demoQueries, demoShops, getDemoProducts, resolveDemoQuery, type DemoMode, type DemoSort } from './demo-data';
import { founderContact, founderLinkedIn } from './landing-content';
import styles from './discover.module.css';

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; abort: () => void;
};
type VoiceWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

function Brand() {
  return <a href="#top" className={styles.brand} aria-label="Retlex AI, back to top">
    <span className={styles.brandIcon}><ShoppingBag size={20} strokeWidth={1.8} aria-hidden="true" /></span>
    <span>retlex<span className={styles.brandDot}>.</span></span><span className={styles.brandAI}>AI</span>
  </a>;
}

function Photo({ src, alt, sizes = '(max-width: 600px) 88vw, 240px', eager = false, cover = false }: { src: string; alt: string; sizes?: string; eager?: boolean; cover?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return failed ? <div className={styles.photoFallback}><Package size={23} aria-hidden="true" /><span>Photo unavailable</span></div>
    : <Image src={src} alt={alt} fill sizes={sizes} loading={eager ? 'eager' : 'lazy'} className={cover ? styles.coverPhoto : styles.productPhoto} onError={() => setFailed(true)} />;
}

function MapPreview({ mode, selected, onSelect }: { mode: DemoMode; selected: number | null; onSelect: (index: number) => void }) {
  const shops = demoShops[mode];
  const preview = selected ?? 0;
  const shop = shops[preview];
  return <aside className={styles.map} aria-label="Illustrative neighbourhood map with simulated shop locations">
    <Image src="/discover/neighbourhood-map.webp" alt="Realistic street-map illustration with city blocks, neighbourhood roads and green parks. This is fictional geography." fill sizes="(max-width: 750px) 92vw, (max-width: 1100px) 34vw, 390px" className={styles.mapImage} loading="eager" />
    <span className={styles.mapLabel}><MapPin size={13} aria-hidden="true" /> Demo neighbourhood</span>
    <div className={styles.mapPins} role="group" aria-label="Choose a sample store on the map">
      {shops.map((item, index) => <button key={item.id} className={`${styles.mapPin} ${styles[`pin${index}`]} ${selected === index ? styles.activePin : ''}`} onClick={() => onSelect(index)} aria-pressed={selected === index} aria-controls="demo-catalog" aria-label={`Show sample catalog for ${item.name}`}>
        <ShoppingBag size={14} aria-hidden="true" /><span>{mode === 'shirts' ? `₹${getDemoProducts(mode, index)[0].price}` : ['Sharma Fresh', 'Daily Basket', 'Gupta General'][index]}</span>
      </button>)}
    </div>
    <button className={styles.mapStore} onClick={() => onSelect(preview)} aria-label={`View sample catalog for ${shop.name}`}>
      <span className={styles.mapStorePhoto}><Photo src={shop.image} alt="Representative Indian storefront photograph" cover sizes="76px" /></span>
      <span className={styles.mapStoreCopy}><strong>{shop.name}</strong><small>{shop.distance} km away · Demo store</small><span>View sample catalog <ArrowRight size={13} aria-hidden="true" /></span></span>
      <ChevronRight size={17} aria-hidden="true" />
    </button>
    <p className={styles.mapCaption}>Illustrative map · Simulated locations</p>
  </aside>;
}

function VoicePreview() {
  return <div className={styles.voicePreview} aria-label="Illustration of voice billing using sample items and prices">
    <div className={styles.voiceTranscript}><span className={styles.voiceOrb}><AudioLines size={23} aria-hidden="true" /></span><div><small>YOU SAY</small><p lang="hi">“दो अमूल दूध, एक ब्राउन ब्रेड”</p></div><Check size={17} aria-hidden="true" /></div>
    <div className={styles.billRows}><div><span>Amul Taaza · 500 ml <small>× 2</small></span><strong>₹56</strong></div><div><span>Brown bread · 400 g <small>× 1</small></span><strong>₹45</strong></div><div className={styles.billTotal}><span>Bill total</span><strong>₹101</strong></div></div>
    <div className={styles.inventoryUpdated}><Database size={14} aria-hidden="true" /><span>Bill saved. Inventory updated.</span><Check size={14} aria-hidden="true" /></div>
    <p className={styles.mockupNote}>Illustrative billing preview · Sample items</p>
  </div>;
}

const navigation = [{ href: '#discovery', label: 'Discover' }, { href: '#retailers', label: 'For Retailers' }, { href: '#contact', label: 'Contact' }];

export default function Discover() {
  const [query, setQuery] = useState(demoQueries.shirts);
  const [mode, setMode] = useState<DemoMode>('shirts');
  const [selected, setSelected] = useState<number | null>(null);
  const [sort, setSort] = useState<DemoSort>('price-asc');
  const [showAll, setShowAll] = useState(false);
  const [message, setMessage] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const results = useRef<HTMLElement>(null);
  const recognition = useRef<Recognition | null>(null);
  const voiceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVoiceSupported(Boolean((window as VoiceWindow).SpeechRecognition || (window as VoiceWindow).webkitSpeechRecognition));
    return () => {
      recognition.current?.abort();
      if (voiceTimeout.current) clearTimeout(voiceTimeout.current);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  function scrollToResults() {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => results.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }), 40);
  }
  function stopVoice() {
    const active = recognition.current;
    recognition.current = null;
    active?.abort();
    if (voiceTimeout.current) clearTimeout(voiceTimeout.current);
    setListening(false);
  }
  function search(value: string, scroll = true) {
    stopVoice();
    setQuery(value);
    const next = resolveDemoQuery(value);
    if (!next) {
      setMessage('Try white shirts, or fresh milk and brown bread. This demo supports the two examples below.');
      return;
    }
    setMode(next); setSelected(null); setSort('price-asc'); setShowAll(false); setMessage('');
    if (scroll) scrollToResults();
  }
  function chooseShop(index: number) { setSelected(index); setShowAll(false); }
  function listen() {
    if (listening) { stopVoice(); return; }
    const Constructor = (window as VoiceWindow).SpeechRecognition || (window as VoiceWindow).webkitSpeechRecognition;
    if (!Constructor) { setMessage('Voice search is unavailable in this browser. Type a query or choose an example.'); return; }
    stopVoice();
    const voice = new Constructor();
    recognition.current = voice;
    voice.lang = 'en-IN'; voice.continuous = false; voice.interimResults = false;
    voice.onresult = event => { if (recognition.current === voice) search(Array.from(event.results).map(result => result[0].transcript).join(' ')); };
    voice.onerror = event => {
      if (recognition.current !== voice || event.error === 'aborted') return;
      stopVoice();
      setMessage(event.error === 'not-allowed' ? 'Microphone access was denied. You can type your query or use either example.' : 'Voice search could not finish. Please type your query or choose an example.');
    };
    voice.onend = () => {
      if (recognition.current !== voice) return;
      recognition.current = null;
      if (voiceTimeout.current) clearTimeout(voiceTimeout.current);
      setListening(false);
      setMessage('No search was received. Try again, type your query, or choose an example.');
    };
    setListening(true); setMessage('');
    voiceTimeout.current = setTimeout(() => { if (recognition.current === voice) { stopVoice(); setMessage('Voice search timed out. Choose an example or type your query to continue.'); } }, 15000);
    try { voice.start(); } catch { stopVoice(); setMessage('The microphone could not start. Type your query or choose an example.'); }
  }

  const shops = demoShops[mode];
  const products = getDemoProducts(mode, selected, sort);
  const visibleProducts = mode === 'shirts' && !showAll ? products.slice(0, 3) : products;

  return <div className={styles.page} id="retlex-page">
    <div id="top" tabIndex={-1} />
    <a className={styles.skipLink} href="#main-content">Skip to content</a>
    <header className={styles.header} onKeyDown={event => { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); } }}>
      <div className={`${styles.container} ${styles.headerInner}`}><Brand />
        <nav className={styles.desktopNav} aria-label="Main navigation">{navigation.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}</nav>
        <div className={styles.headerActions}><Link className={styles.navCta} href="/" prefetch={false}>Try Live Billing <ArrowUpRight size={15} aria-hidden="true" /></Link><button ref={menuButton} className={styles.menuButton} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls={menuOpen ? 'mobile-navigation' : undefined} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button></div>
      </div>
      {menuOpen && <nav id="mobile-navigation" className={styles.mobileNav} aria-label="Mobile navigation">{navigation.map(item => <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}<ArrowUpRight size={16} aria-hidden="true" /></a>)}</nav>}
    </header>

    <main id="main-content" tabIndex={-1}>
      <section className={`${styles.container} ${styles.hero}`} aria-labelledby="hero-title">
        <span className={styles.eyebrow}><span className={styles.orangeDot} /> YOUR NEIGHBOURHOOD, DISCOVERED</span>
        <h1 id="hero-title">Find what’s nearby.<br className={styles.mobileBreak} /> <span>Instantly.</span></h1>
        <p className={styles.heroDescription}>Discover products in the shops around you.<br className={styles.desktopBreak} /> Our vision: local inventory, connected and searchable.</p>
        <form className={`${styles.search} ${listening ? styles.listening : ''}`} onSubmit={event => { event.preventDefault(); search(query); }}>
          <Search size={20} aria-hidden="true" /><input aria-label="Search the discovery demo" aria-describedby="search-support" value={query} onChange={event => setQuery(event.target.value)} placeholder="What are you looking for?" maxLength={200} />
          {voiceSupported && <button type="button" className={styles.micButton} aria-label={listening ? 'Stop voice search' : 'Speak a demo search'} aria-pressed={listening} onClick={listen}>{listening ? <X size={18} /> : <Mic size={18} />}</button>}
          <button type="submit" className={styles.searchSubmit} aria-label="Search sample products"><ArrowRight size={20} /></button>
        </form>
        <div className={styles.suggestions} role="group" aria-label="Example searches"><button aria-pressed={mode === 'shirts'} className={mode === 'shirts' ? styles.activeSuggestion : ''} onClick={() => search(demoQueries.shirts, false)}><Shirt size={15} aria-hidden="true" /> White shirt · lowest price</button><button aria-pressed={mode === 'groceries'} className={mode === 'groceries' ? styles.activeSuggestion : ''} onClick={() => search(demoQueries.groceries, false)}><ShoppingBag size={15} aria-hidden="true" /> Fresh milk & brown bread</button></div>
        <p className={styles.searchSupport} id="search-support" role="status">{listening ? 'Listening… say white shirt, or milk and brown bread.' : 'Discovery concept demo · Sample inventory, prices and distances.'}</p>
        {message && <p className={styles.message} role="status">{message}</p>}
      </section>

      <section ref={results} id="discovery" className={`${styles.container} ${styles.discovery}`} aria-labelledby="discovery-title">
        <div className={styles.demoHeading}><div><h2 id="discovery-title">{selected !== null ? shops[selected].name : mode === 'shirts' ? 'White shirts, around the corner.' : 'Your everyday essentials, nearby.'}</h2><p aria-live="polite">{selected !== null ? `${products.length} products in this sample catalog` : mode === 'shirts' ? `Showing ${visibleProducts.length} of ${products.length} products · 3 demo stores` : '3 demo stores · Choose a shop to explore its catalog'}</p></div><div className={styles.catalogActions}>{selected !== null && <button className={styles.resetFilter} onClick={() => { setSelected(null); setShowAll(false); }}><X size={13} aria-hidden="true" /> All shops</button>}{products.length > 0 && <label className={styles.sortLabel}><span className={styles.srOnly}>Sort sample products</span><select value={sort} onChange={event => setSort(event.target.value as DemoSort)}><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="distance">Distance: nearest</option></select></label>}</div></div>
        <div className={styles.demoGrid}>
          <div className={styles.catalog} id="demo-catalog">
            {mode === 'groceries' && selected === null ? <div className={styles.productGrid}>{shops.map((shop, index) => <button key={shop.id} className={styles.groceryShop} onClick={() => chooseShop(index)} aria-label={`Open sample catalog for ${shop.name}`}>
              <span className={styles.storePhoto}><Photo src={shop.image} alt="Representative Indian grocery storefront; this business is not a verified Retlex participant" cover /><span>Representative photo</span></span>
              <span className={styles.groceryShopInfo}><strong>{shop.name}</strong><span><MapPin size={12} aria-hidden="true" /> {shop.distance} km · {shop.street}</span><small>Amul, Sanchi & brown bread</small><span className={styles.viewCatalog}>View catalog <ArrowRight size={14} aria-hidden="true" /></span></span>
            </button>)}</div> : <div className={`${styles.productGrid} ${mode === 'groceries' ? styles.groceryGrid : ''}`} key={`${mode}-${selected ?? 'all'}`}>{visibleProducts.map(product => <article key={product.id} className={`${styles.productCard} ${mode === 'groceries' ? styles.groceryCard : ''}`}>
              {mode === 'shirts' && <button className={styles.storePhoto} onClick={() => chooseShop(product.shop)} aria-label={`View sample catalog for ${shops[product.shop].name}`}><Photo src={shops[product.shop].image} alt="Representative photograph of a real Indian clothing shop; this business is not a verified Retlex participant" cover eager /><span>Representative photo</span></button>}
              <div className={styles.productInfo}>
                {mode === 'shirts' && <div className={styles.storeName}>{shops[product.shop].name}<span><MapPin size={11} aria-hidden="true" />{shops[product.shop].distance} km</span></div>}
                <div className={styles.productDetail}><span className={styles.productThumb}><Photo src={product.image} alt={`${product.name}, ${product.detail}; illustrative product photo`} sizes="65px" eager={mode === 'shirts'} /></span><div><h3>{product.name}</h3><p>{product.detail}</p><strong className={styles.price}>₹{product.price}</strong></div></div>
                <div className={styles.productFoot}><span className={product.stock ? styles.stock : styles.outOfStock}>{product.stock ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}{product.stock ? `${product.stock} in sample stock` : 'Out of sample stock'}</span>{mode === 'shirts' && <button onClick={() => chooseShop(product.shop)} aria-label={`Explore sample products at ${shops[product.shop].name}`}><ArrowUpRight size={17} aria-hidden="true" /></button>}</div>
              </div>
            </article>)}</div>}
            {mode === 'shirts' && products.length > 3 && <button className={styles.showMore} onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>{showAll ? 'Show fewer products' : `Show all ${products.length} products`}<ChevronDown className={showAll ? styles.chevronUp : ''} size={15} aria-hidden="true" /></button>}
          </div>
          <MapPreview mode={mode} selected={selected} onSelect={chooseShop} />
        </div>
        <p className={styles.demoNote}>A preview of the vision. Shops and availability are simulated; photos are representative.</p>
      </section>

      <section id="retailers" className={`${styles.container} ${styles.retailers}`} aria-labelledby="retailers-title">
        <div className={styles.retailerCopy}><span className={styles.eyebrow}><span className={styles.liveDot} /> RETLEX VOICE · WORKING PRODUCT</span><h2 id="retailers-title">Speak. Check. Bill.</h2><p>Hindi-friendly voice billing that matches products, creates bills and updates inventory. Built around how Indian shopkeepers work.</p><Link className={styles.primaryButton} href="/" prefetch={false}>Try Live Voice Billing <ArrowUpRight size={17} aria-hidden="true" /></Link><p className={styles.visionNote}>Digital inventory today.<br /><strong>The foundation for local discovery tomorrow.</strong></p></div>
        <VoicePreview />
      </section>
    </main>

    <footer id="contact" className={`${styles.container} ${styles.footer}`}>
      <div><Brand /><p>Connecting the shop around the corner.</p></div>
      <div className={styles.founderContact}><span>Interested in Retlex? Let’s talk.</span><a href={founderContact ?? 'mailto:nikhil@retlex.shop'}>Contact the Founder <ArrowUpRight size={15} aria-hidden="true" /></a><a className={styles.linkedIn} href={founderLinkedIn} target="_blank" rel="noopener noreferrer">Nikhil Kushwaha · LinkedIn <ArrowUpRight size={13} aria-hidden="true" /></a></div>
      <div className={styles.footerBottom}><span>© {new Date().getFullYear()} Retlex AI</span><span>Voice billing is functional. Connected discovery is in development.</span></div>
    </footer>
  </div>;
}
