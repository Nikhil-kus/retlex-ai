'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ArrowUpRight, Camera, Check, CircleHelp, Loader2, Mic, Package, ReceiptText, Search, ShoppingBag, Store, Wifi, WifiOff, X } from 'lucide-react';
import styles from './scan-home.module.css';

interface Props {
  shopName: string; catalogCount: number; pendingCount: number; unpaidAmount: number;
  loading: boolean; error: string; previewUrl: string | null; processing: boolean;
  onRefresh: () => void; onOrders: () => void; onCatalog: () => void;
  onUpload: () => void; onProcess: () => void; children: ReactNode;
}

export default function ScanHome({ shopName, catalogCount, pendingCount, unpaidAmount, loading, error, previewUrl, processing, onRefresh, onOrders, onCatalog, onUpload, onProcess, children }: Props) {
  const [online, setOnline] = useState(true);
  const [help, setHelp] = useState(false);
  const [date, setDate] = useState('');
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    setDate(new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date()));
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  return <section className={styles.home} aria-label="Start a bill">
    <header className={styles.meta}>
      <div className={styles.shop}><Store size={15} /><span>{shopName}</span><span className={styles.date}>{date}</span></div>
      <div className={styles.tools}><span className={`${styles.connection} ${online ? '' : styles.offline}`}>{online ? <Wifi size={12} /> : <WifiOff size={12} />}{online ? 'Online' : 'Offline'}</span><button onClick={() => setHelp(!help)} aria-label="Billing quick guide" aria-expanded={help}><CircleHelp size={18} /></button></div>
    </header>

    {!online && <p className={styles.notice} role="status">Your draft stays in this tab. Reconnect before saving a bill.</p>}
    {help && <div className={styles.guide}><button onClick={() => setHelp(false)} aria-label="Close quick guide"><X size={16} /></button><strong>Three steps. One simple bill.</strong><p>Hold the microphone and say your items, scan a list, or search your catalog. Review quantities and prices, then save and share your receipt.</p></div>}

    <div className={styles.hero}>
      <div className={styles.heroCopy}><p className={styles.eyebrow}><span /> READY FOR YOUR NEXT CUSTOMER</p><h1>A little less work.<br /><span>A lot more business.</span></h1><p className={styles.subtitle}>Start with your voice. We’ll help with the bill.</p></div>
      <div className={styles.voiceArt} aria-hidden="true"><div className={styles.orbit} /><div className={styles.orbitInner} /><div className={styles.wave}>{[13, 23, 34, 19, 42, 28, 16].map((height, index) => <i key={index} style={{ height }} />)}</div><span className={styles.mic}><Mic size={30} strokeWidth={1.5} /></span><span className={styles.ready}><Check size={12} /> Ready when you are</span></div>
    </div>

    <div className={styles.voicePrompt}><span className={styles.promptIcon}><Mic size={18} /></span><div><strong>Hold. Speak. Release.</strong><p>Use the microphone below, then review your items.</p></div><span className={styles.shortcut}>VOICE BILLING</span></div>

    <div className={styles.actions}>
      <button onClick={onUpload} disabled={processing}><span className={styles.actionIcon}><Camera size={21} strokeWidth={1.6} /></span><span><strong>{previewUrl ? 'Change shopping list' : 'Scan a shopping list'}</strong><small>Take a photo or upload a slip</small></span><ArrowUpRight size={17} /></button>
      <button onClick={onCatalog}><span className={styles.actionIcon}><Search size={21} strokeWidth={1.6} /></span><span><strong>Pick from your catalog</strong><small>Search products and add items</small></span><ArrowUpRight size={17} /></button>
    </div>

    {previewUrl && <div className={styles.preview}><img src={previewUrl} alt="Shopping list ready to scan" /><div><strong>Your list is ready</strong><p>Review the detected items before adding them.</p><button onClick={onProcess} disabled={processing}>{processing ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}{processing ? 'Reading your list…' : 'Read shopping list'}</button></div></div>}

    <div className={styles.summaryHeading}><span>Your shop at a glance</span><span>LIVE OVERVIEW</span></div>
    <div className={styles.stats}>
      <button onClick={onOrders}><span className={styles.statLabel}><ShoppingBag size={14} />Pending orders</span><strong>{loading ? '—' : pendingCount}<ArrowUpRight size={14} /></strong></button>
      <button onClick={onOrders}><span className={styles.statLabel}><ReceiptText size={14} />Unpaid balance</span><strong>{loading ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(unpaidAmount)}<ArrowUpRight size={14} /></strong></button>
      <button onClick={onCatalog}><span className={styles.statLabel}><Package size={14} />Products</span><strong>{catalogCount}<ArrowUpRight size={14} /></strong></button>
    </div>
    {error && <div className={styles.notice} role="alert">{error}<button disabled={loading} onClick={onRefresh}>Retry</button></div>}
    <div className={styles.settings}>{children}</div>
  </section>;
}
