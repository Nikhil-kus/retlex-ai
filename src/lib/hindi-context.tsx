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

export const CATEGORY_IMAGES: Record<string, string> = {
  'Grains & Cereals':       'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80',
  'Pulses & Dals':          'https://images.unsplash.com/photo-1585996388902-61cc0014b1b8?w=400&q=80',
  'Salt & Sugar':           'https://images.unsplash.com/photo-1581600140682-d4e68c8cde32?w=400&q=80',
  'Oils & Ghee':            'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80',
  'Spices & Masala':        'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&q=80',
  'Tea & Coffee':           'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&q=80',
  'Dairy & Milk Products':  'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=80',
  'Instant Foods & Noodles':'https://images.unsplash.com/photo-1612966608967-309bf478888b?w=400&q=80',
  'Biscuits & Snacks':      'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=400&q=80',
  'Confectionery':          'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=400&q=80',
  'Beverages':              'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80',
  'Soaps':                  'https://images.unsplash.com/photo-1607006342411-92326cf37f61?w=400&q=80',
  'Shampoo':                'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&q=80',
  'Oral Care':              'https://images.unsplash.com/photo-1559599189-fe84dea4eb79?w=400&q=80',
  'Handwash':               'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&q=80',
  'Hair Oil':               'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&q=80',
  'Face Creams':            'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=400&q=80',
  'Moisturisers':           'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&q=80',
  'Grooming':               'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80',
  'Personal Care':          'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=400&q=80',
  'Household Cleaning':     'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80',
  'Laundry':                'https://images.unsplash.com/photo-1545173168-9f1947eebd01?w=400&q=80',
  'Household Essentials':   'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400&q=80',
  'Pooja Items':            'https://images.unsplash.com/photo-1609137144813-75b22b109e32?w=400&q=80',
  'Dry Fruits':             'https://images.unsplash.com/photo-1596560548464-f03df624f61f?w=400&q=80',
  'Tobacco & Pan':          'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?w=400&q=80',
  'Uncategorized':          'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400&q=80',
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
