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
  const ActiveIcon = tabs[activeIndex].icon;

  return (
    <nav
      aria-label="Billing tabs"
      hidden={hidden}
      className={styles.dock}
      style={{ '--dock-center': `${((activeIndex + 0.5) / tabs.length) * 100}%` } as CSSProperties}
    >
      <div className={styles.artwork} aria-hidden="true">
        <div className={styles.water} />
        {/* One moving parent keeps the sun, icon, and cutout aligned, even
            when another tab is selected before the animation finishes. */}
        <div className={styles.traveler}>
          <svg className={styles.notch} width="112" height="48" viewBox="0 0 112 48">
            <path className={styles.cutout} d="M0 0 C22 0 20 44 56 44 C92 44 90 0 112 0 Z" />
            <path className={styles.rimShadow} d="M0 1 C22 1 20 45 56 45 C92 45 90 1 112 1" />
            <path className={styles.rim} d="M0 0 C22 0 20 44 56 44 C92 44 90 0 112 0" />
          </svg>
          <div className={styles.reflection} />
          <div className={styles.sun}>
            <ActiveIcon size={25} strokeWidth={2.2} />
          </div>
        </div>
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
            className={styles.tab}
          >
            <Icon size={23} strokeWidth={1.8} aria-hidden="true" className={styles.restIcon} />
            <span className={styles.label}>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
