'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface HindiContextType {
  hindiMode: boolean;
  toggleHindi: () => void;
  /** Returns localName if hindiMode is on and localName exists, else name */
  pName: (name: string, localName?: string | null) => string;
  /** Returns Hindi category name if hindiMode is on, else original */
  catName: (cat: string) => string;
  /** True when the manual search input is focused or has text — used to hide fixed UI buttons */
  isSearching: boolean;
  setIsSearching: (v: boolean) => void;
  /** False when user scrolled down — used to hide the fixed menu button in sync with the header */
  headerVisible: boolean;
  setHeaderVisible: (v: boolean) => void;
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
  'Grains & Cereals':       '/category-images/cat_grains_1780419799921.png', 
  'Pulses & Dals':          '/category-images/cat_pulses_1780419813535.png', 
  'Salt & Sugar':           '/category-images/cat_salt_sugar_1780478445287.png', 
  'Oils & Ghee':            '/category-images/cat_oils_1780420011308.png', 
  'Spices & Masala':        '/category-images/cat_spices_1780419826819.png', 
  'Tea & Coffee':           '/category-images/cat_tea_coffee_1780420150721.png', 
  'Dairy & Milk Products':  '/category-images/cat_dairy_1780420025332.png', 
  'Instant Foods & Noodles':'/category-images/cat_instant_1780420082763.png', 
  'Biscuits & Snacks':      '/category-images/cat_snacks_1780420067917.png', 
  'Confectionery':          '/category-images/cat_confectionery_1780421042849.png', 
  'Beverages':              '/category-images/cat_beverages_1780420039552.png', 
  'Soaps':                  '/category-images/cat_personal_care_1780420098124.png', 
  'Shampoo':                'https://images.openfoodfacts.org/images/products/890/103/093/7170/front_en.3.400.jpg', 
  'Oral Care':              'https://images.openbeautyfacts.org/images/products/628/100/111/2013/front_en.5.400.jpg', 
  'Handwash':               '/category-images/cat_handwash_1780478488434.png', 
  'Hair Oil':               '/category-images/cat_hair_oil_1780421091846.png', 
  'Face Creams':            '/category-images/cat_face_cream_1780421057105.png', 
  'Moisturisers':           'https://images.openbeautyfacts.org/images/products/628/100/640/8647/front_de.15.400.jpg', 
  'Grooming':               '/category-images/cat_personal_care_new_1780478502088.png', 
  'Personal Care':          '/category-images/cat_personal_care_new_1780478502088.png', 
  'Household Cleaning':     '/category-images/cat_cleaning_1780420120929.png', 
  'Laundry':                'https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?w=400&q=80', 
  'Household Essentials':   '/category-images/cat_household_1780478461296.png', 
  'Pooja Items':            '/category-images/cat_pooja_1780478446011.png', 
  'Dry Fruits':             '/category-images/cat_dry_fruits_1780421078047.png', 
  'Tobacco & Pan':          '/category-images/cat_pan_1780421024418.png', 
  'Uncategorized':          '/category-images/cat_misc_1780420135026.png', 
};

const HindiContext = createContext<HindiContextType>({
  hindiMode: false,
  toggleHindi: () => {},
  pName: (name) => name,
  catName: (cat) => cat,
  isSearching: false,
  setIsSearching: () => {},
  headerVisible: true,
  setHeaderVisible: () => {},
});

export function HindiProvider({ children }: { children: ReactNode }) {
  const [hindiMode, setHindiMode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);

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
    <HindiContext.Provider value={{ hindiMode, toggleHindi, pName, catName, isSearching, setIsSearching, headerVisible, setHeaderVisible }}>
      {children}
    </HindiContext.Provider>
  );
}

export const useHindi = () => useContext(HindiContext);
