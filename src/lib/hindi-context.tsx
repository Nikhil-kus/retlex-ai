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
  'Grains & Cereals':       'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&q=80', // Atta / Flour
  'Pulses & Dals':          'https://images.unsplash.com/photo-1585996388902-61cc0014b1b8?w=400&q=80', // Indian Lentils/Dals
  'Salt & Sugar':           'https://images.unsplash.com/photo-1618036329156-f06b9a7f347d?w=400&q=80', // Sugar/Salt crystals
  'Oils & Ghee':            'https://images.unsplash.com/photo-1589733901241-5e514f26b547?w=400&q=80', // Desi Ghee in Matka
  'Spices & Masala':        'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&q=80', // Colorful Indian Spices
  'Tea & Coffee':           'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=400&q=80', // Cutting Chai pouring
  'Dairy & Milk Products':  'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400&q=80', // Fresh Paneer Cubes
  'Instant Foods & Noodles':'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400&q=80', // Prepared instant noodles
  'Biscuits & Snacks':      'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=400&q=80', // Crispy Samosas plate
  'Confectionery':          'https://images.unsplash.com/photo-1589119908995-c6837fa14848?w=400&q=80', // Gulab Jamun Indian sweets
  'Beverages':              'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&q=80', // Mango Lassi
  'Soaps':                  'https://images.unsplash.com/photo-1607006342400-b700f8426f15?w=400&q=80', // Natural bath soap bar
  'Shampoo':                'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&q=80', // Shampoo/Herbal wash bottles
  'Oral Care':              'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400&q=80', // Toothpaste and brushes
  'Handwash':               'https://images.unsplash.com/photo-1603507383777-6f9479b18598?w=400&q=80', // Liquid handwash dispenser
  'Hair Oil':               'https://images.unsplash.com/photo-1617897903246-719242758050?w=400&q=80', // Ayurvedic hair oil leaves
  'Face Creams':            'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&q=80', // Cosmetic jar
  'Moisturisers':           'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80', // Moisturiser lotion bottle
  'Grooming':               'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&q=80', // Grooming brush and comb
  'Personal Care':          'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=400&q=80', // Herbal/natural personal care
  'Household Cleaning':     'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=400&q=80', // Household sprays and cleaners
  'Laundry':                'https://images.unsplash.com/photo-1610557892470-76d747e925df?w=400&q=80', // Blue detergent powder scoop
  'Household Essentials':   'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=400&q=80', // Matchbox
  'Pooja Items':            'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&q=80', // Brass Diya oil lamp
  'Dry Fruits':             'https://images.unsplash.com/photo-1596560548464-f03df624f61f?w=400&q=80', // Almonds and dry fruits bowl
  'Tobacco & Pan':          'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=400&q=80', // Fresh green betel leaves (Paan)
  'Uncategorized':          'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80', // Indian Kirana store view
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
