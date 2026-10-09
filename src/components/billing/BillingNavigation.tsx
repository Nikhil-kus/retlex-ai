'use client';

import { useRef, type CSSProperties } from 'react';
import { ScanLine, ReceiptText, Search } from 'lucide-react';
import styles from './navigation.module.css';

type Mode = 'OCR' | 'PENDING' | 'MANUAL';
const tabs = [
  { mode: 'OCR', label: 'Scan', Icon: ScanLine },
  { mode: 'PENDING', label: 'Billing', Icon: ReceiptText },
  { mode: 'MANUAL', label: 'Search', Icon: Search },
] as const;

export default function BillingNavigation({ mode, onChange, disabled }: { mode: Mode; onChange: (mode: Mode) => void; disabled: boolean }) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = tabs.findIndex(tab => tab.mode === mode);

  return <nav className={styles.navigation} aria-label="Billing workspace views">
    <div className={styles.track} role="tablist" aria-label="Scan, billing and search" style={{ '--active-tab': activeIndex } as CSSProperties}>
      <span className={styles.indicator} aria-hidden="true" />
      {tabs.map(({ mode: value, label, Icon }, index) => <button
        key={value}
        ref={element => { buttons.current[index] = element; }}
        id={`billing-tab-${value}`}
        role="tab"
        aria-selected={mode === value}
        aria-controls={`billing-panel-${value}`}
        tabIndex={mode === value ? 0 : -1}
        disabled={disabled}
        className={styles.tab}
        onClick={() => onChange(value)}
        onKeyDown={event => {
          let next = index;
          if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
          else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = tabs.length - 1;
          else return;
          event.preventDefault();
          onChange(tabs[next].mode);
          buttons.current[next]?.focus();
        }}
      ><span className={styles.icon}><Icon size={18} strokeWidth={1.8} /></span><span className={styles.label}>{label}</span></button>)}
    </div>
  </nav>;
}
