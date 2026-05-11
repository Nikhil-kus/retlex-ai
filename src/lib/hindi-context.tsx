'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface HindiContextType {
  hindiMode: boolean;
  toggleHindi: () => void;
  /** Returns localName if hindiMode is on and localName exists, else name */
  pName: (name: string, localName?: string | null) => string;
}

const HindiContext = createContext<HindiContextType>({
  hindiMode: false,
  toggleHindi: () => {},
  pName: (name) => name,
});

export function HindiProvider({ children }: { children: ReactNode }) {
  const [hindiMode, setHindiMode] = useState(false);

  // Persist preference across page loads
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

  return (
    <HindiContext.Provider value={{ hindiMode, toggleHindi, pName }}>
      {children}
    </HindiContext.Provider>
  );
}

export const useHindi = () => useContext(HindiContext);
