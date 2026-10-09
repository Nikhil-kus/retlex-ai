'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, CircleHelp, Package, ReceiptText, RefreshCw, ShoppingBag, Wifi, WifiOff, X } from 'lucide-react';
import styles from './billing.module.css';

export default function BillingOverview({ shopName, catalogCount, pendingCount, unpaidAmount, loading, error, onRefresh, onOrders, onCatalog }: { shopName: string; catalogCount: number; pendingCount: number; unpaidAmount: number; loading: boolean; error: string; onRefresh: () => void; onOrders: () => void; onCatalog: () => void }) {
  const [online, setOnline] = useState(true);
  const [help, setHelp] = useState(false);
  const [date, setDate] = useState('');
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update(); setDate(new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date()));
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return <>
    <header className={styles.pageHeader}><div><div className={styles.breadcrumb}>Workspace <span>/</span> <strong>Billing</strong></div><h1>A little less work.<br className={styles.mobileBreak} /> A lot more business.</h1><p>{shopName} <span>·</span> {date}</p></div><div className={styles.headerActions}><span className={`${styles.connection} ${!online ? styles.offline : ''}`}>{online ? <Wifi size={13} /> : <WifiOff size={13} />}{online ? 'Online' : 'Offline'}</span><button onClick={() => setHelp(!help)} aria-label="Billing quick guide" aria-expanded={help}><CircleHelp size={19} /></button></div></header>
    {!online && <p className={styles.notice} role="status">You’re offline. Keep this tab open; your draft stays here. Reconnect before saving a bill.</p>}
    {help && <div className={styles.guide}><button onClick={() => setHelp(false)} aria-label="Close quick guide"><X size={16} /></button><strong>Your counter, in three steps</strong><p>1. Hold the microphone to speak, scan a shopping list, or search your catalog.</p><p>2. Review quantities and prices in Current bill, then choose payment details.</p><p>3. Save the bill. Print or share the receipt, and track the order in Bills.</p></div>}
    <div className={styles.stats}>
      <button onClick={onOrders}><span className={styles.statIcon}><ShoppingBag size={19} /></span><span><small>Pending orders</small><strong>{loading ? '—' : pendingCount}</strong></span><ArrowUpRight size={15} /></button>
      <button onClick={onOrders}><span className={`${styles.statIcon} ${styles.amber}`}><ReceiptText size={19} /></span><span><small>Unpaid balance</small><strong>{loading ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(unpaidAmount)}</strong></span><ArrowUpRight size={15} /></button>
      <button onClick={onCatalog}><span className={`${styles.statIcon} ${styles.green}`}><Package size={19} /></span><span><small>Products in catalog</small><strong>{catalogCount}</strong></span><ArrowUpRight size={15} /></button>
    </div>
    {error && <div className={styles.notice} role="alert">{error}<button onClick={onRefresh} disabled={loading}><RefreshCw size={14} /> Retry</button></div>}
  </>;
}
