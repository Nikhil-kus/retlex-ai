'use client';

import type { CSSProperties } from 'react';
import { FileText, Search, ShoppingCart } from 'lucide-react';
import styles from './BillingDock.module.css';

type BillingMode = 'OCR' | 'PENDING' | 'MANUAL';

const tabs = [
  { value: 'OCR', label: 'Scan', icon: FileText },
  { value: 'PENDING', label: 'Bills', icon: ShoppingCart },
  { value: 'MANUAL', label: 'Search', icon: Search },
] as const;

export default function BillingDock({ value, onChange, hidden }: {
  value: BillingMode;
  onChange: (value: BillingMode) => void;
  hidden: boolean;
}) {
  const activeIndex = tabs.findIndex(tab => tab.value === value);

  return (
    <nav
      aria-label="Billing tabs"
      hidden={hidden}
      className={styles.dock}
      style={{ '--dock-center': `${((activeIndex + 0.5) / tabs.length) * 100}%` } as CSSProperties}
    >
      <div className={`${styles.surface} text-slate-100`} aria-hidden="true">
        <div className={styles.leadingSurface} />
        <svg className={styles.notch} width="96" height="72" viewBox="0 0 96 72" fill="currentColor">
          <path d="M0 0 C16 0 14 38 48 38 C82 38 80 0 96 0 V72 H0 Z" />
        </svg>
        <div className={styles.trailingSurface} />
        <div className={styles.surfaceFloor} />
      </div>

      <div className={styles.buttons}>
        {tabs.map(({ value: tabValue, label, icon: Icon }) => (
          <button
            key={tabValue}
            type="button"
            aria-label={label}
            aria-pressed={value === tabValue}
            title={label}
            onClick={() => onChange(tabValue)}
            className={`${styles.tab} text-slate-500 hover:text-slate-700 focus-visible:outline-indigo-500`}
          >
            <Icon size={18} aria-hidden="true" className={styles.restIcon} />
            <span
              aria-hidden="true"
              className={`${styles.bubble} bg-indigo-100 text-indigo-700 border border-indigo-500 shadow-sm`}
            >
              <Icon size={18} />
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
