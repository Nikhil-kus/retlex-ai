'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface HindiContextType {
  hindiMode: boolean;
  toggleHindi: () => void;
  /** Returns localName if hindiMode is on and localName exists, else name */
  pName: (name: string, localName?: string | null) => string;
  /** Returns Hindi category name if hindiMode is on, else original */
  catName: (cat: string) => string;
}

export const CATEGORY_HINDI: Record<string, string> = {
  'Grains & Cereals':       'अनाज व दालें',
  'Pulses & Dals':          'दालें',
  'Salt & Sugar':           'नमक व चीनी',
  'Oils & Ghee':            'तेल व घी',
  'Spices & Masala':        'मसाले',
  'Tea & Coffee':           'चाय व कॉफी',
  'Dairy & Milk Products':  'दूध व डेयरी',
  'Instant Foods & Noodles':'इंस्टेंट फूड व नूडल्स',
  'Biscuits & Snacks':      'बिस्कुट व स्नैक्स',
  'Confectionery':          'मिठाई व चॉकलेट',
  'Beverages':              'पेय पदार्थ',
  'Soaps':                  'साबुन',
  'Shampoo':                'शैम्पू',
  'Oral Care':              'दांत की देखभाल',
  'Handwash':               'हैंडवॉश',
  'Hair Oil':               'बाल तेल',
  'Face Creams':            'फेस क्रीम',
  'Moisturisers':           'मॉइस्चराइज़र',
  'Grooming':               'ग्रूमिंग',
  'Personal Care':          'व्यक्तिगत देखभाल',
  'Household Cleaning':     'घर की सफाई',
  'Laundry':                'कपड़े धोना',
  'Household Essentials':   'घरेलू सामान',
  'Pooja Items':            'पूजा सामग्री',
  'Dry Fruits':             'मेवे',
  'Tobacco & Pan':          'तंबाकू व पान',
  'Uncategorized':          'अन्य',
};

const HindiContext = createContext<HindiContextType>({
  hindiMode: false,
  toggleHindi: () => {},
  pName: (name) => name,
  catName: (cat) => cat,
});

export function HindiProvider({ children }: { children: ReactNode }) {
  const [hindiMode, setHindiMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('hindiMode');
    if (stored === 'true') setHindiMode(true);
  }, []);

  const toggleHindi = () => {
    setHindiMode(prev => {
      localStorage.setItem('hindiMode', String(!prev));
      return !prev;
    });
  };

  const pName = (name: string, localName?: string | null) => {
    if (hindiMode && localName && localName.trim()) return localName.trim();
    return name;
  };

  const catName = (cat: string) => {
    if (hindiMode && CATEGORY_HINDI[cat]) return CATEGORY_HINDI[cat];
    return cat;
  };

  return (
    <HindiContext.Provider value={{ hindiMode, toggleHindi, pName, catName }}>
      {children}
    </HindiContext.Provider>
  );
}

export const useHindi = () => useContext(HindiContext);
