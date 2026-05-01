'use client';
import Fuse from 'fuse.js';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Camera, FileText, Upload, Plus, Minus, Trash, CheckCircle, TriangleAlert, ShoppingCart, X, Package } from 'lucide-react';
import { generateWhatsAppMessage, openWhatsAppChat } from '@/lib/whatsapp-utils';

export default function BillingPage() {
  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const globalTranscriptRef = useRef("");
  const currentBreathRef = useRef("");
  const baseReviewItemsRef = useRef<any[]>([]);
  const itemOverridesRef = useRef<Record<string, any>>({});

  const mergeOverlappingStrings = (s1: string, s2: string) => {
    if (!s1) return s2 || "";
    if (!s2) return s1 || "";
    
    const s1Lower = s1.trim().toLowerCase();
    const s2Lower = s2.trim().toLowerCase();
    
    if (s1Lower === s2Lower) return s1.trim();
    if (s2Lower.startsWith(s1Lower)) return s2.trim();
    if (s1Lower.endsWith(s2Lower)) return s1.trim();

    const words1 = s1.trim().split(/\s+/);
    const words2 = s2.trim().split(/\s+/);

    let maxOverlap = 0;
    const minLen = Math.min(words1.length, words2.length);
    
    for (let i = 1; i <= minLen; i++) {
        const endOfS1 = words1.slice(-i).join(" ").toLowerCase();
        const startOfS2 = words2.slice(0, i).join(" ").toLowerCase();
        if (endOfS1 === startOfS2) {
            maxOverlap = i;
        }
    }
    
    if (maxOverlap > 0) {
        return words1.slice(0, words1.length - maxOverlap).concat(words2).join(" ");
    }
    return s1.trim() + " " + s2.trim();
  };

  const parseVoiceItems = (text: string) => {
    // PRE-PROCESSING: Normalization for robust parsing
    text = text.toLowerCase().trim()
      // Remove prices so they aren't parsed as quantities (e.g. "50 wala namak" -> "namak")
      .replace(/(\d+(?:\.\d+)?)\s*(wala|wale|wali|वाला|वाले|वाली|rs|rupees|rupya|rupaye|रुपये|रुपया|रुपए)/gi, ' ')
      .replace(/\b(wala|wale|wali|वाला|वाले|वाली|rs|rupees|rupya|rupaye|रुपये|रुपया|रुपए)\b/gi, ' ')
      // Remove filler words that cause incorrect item grouping
      .replace(/\b(and|plus)\b/gi, ' ')
      .replace(/और|तथा|भी|या/g, ' ')
      .replace(/\b(aur|tatha|bhi|ya)\b/gi, ' ')
      // Fix misheard numbers (phonetic matching)
      .replace(/\b(to|too|tu|two|तो|टो|do|दो)\b/gi, ' 2 ')
      .replace(/\b(for|four|फ़ॉर|फॉर|फोर)\b/gi, ' 4 ')
      .replace(/\b(won|one|वन|on|un|an)\b/gi, ' 1 ')
      .replace(/\b(at|eight|एट|it)\b/gi, ' 8 ')
      .replace(/\b(teen|three|थ्री|तीन|tin)\b/gi, ' 3 ')
      .replace(/\b(five|फाइव|पाइप|पांच|panch)\b/gi, ' 5 ')
      .replace(/\b(six|सिक्स|छह|che|chhe)\b/gi, ' 6 ')
      .replace(/\b(ten|टेन|दस|das)\b/gi, ' 10 ')
      // Convert compound weights (2 kg 500 g -> 2.5 kg)
      .replace(/(\d+(?:\.\d+)?)\s*(kg|kilo|kilos|किलो)\s+(\d+(?:\.\d+)?)\s*(g|gram|grams|ग्राम)/gi, (match, kg, kgUnit, g, gUnit) => {
        return (parseFloat(kg) + parseFloat(g) / 1000).toString() + " kg";
      })
      .replace(/(\d+(?:\.\d+)?)\s*(l|liter|litre|litres|लीटर)\s+(\d+(?:\.\d+)?)\s*(ml|mili|मिली)/gi, (match, l, lUnit, ml, mlUnit) => {
        return (parseFloat(l) + parseFloat(ml) / 1000).toString() + " l";
      })
      // Hindi weight phrasing
      .replace(/ढाई\s*सौ/g, '250').replace(/dhai\s*sau/g, '250')
      .replace(/डेढ़\s*सौ/g, '150').replace(/dedh\s*sau/g, '150')
      .replace(/एक\s*सौ\s*पचास/g, '150').replace(/ek\s*sau\s*pachas/g, '150')
      .replace(/दो\s*सौ\s*पचास/g, '250').replace(/do\s*sau\s*pachas/g, '250')
      .replace(/एक\s*सौ/g, '100').replace(/ek\s*sau/g, '100')
      .replace(/दो\s*सौ/g, '200').replace(/do\s*sau/g, '200')
      .replace(/तीन\s*सौ/g, '300').replace(/teen\s*sau/g, '300')
      .replace(/चार\s*सौ/g, '400').replace(/char\s*sau/g, '400')
      .replace(/पांच\s*सौ/g, '500').replace(/paanch\s*sau/g, '500')
      .replace(/छह\s*सौ/g, '600').replace(/che\s*sau/g, '600')
      .replace(/सात\s*सौ/g, '700').replace(/saat\s*sau/g, '700')
      .replace(/आठ\s*सौ/g, '800').replace(/aath\s*sau/g, '800')
      .replace(/नौ\s*सौ/g, '900').replace(/nau\s*sau/g, '900')
      // Hindi fractions
      .replace(/आधा/g, '0.5').replace(/aadha/g, '0.5')
      .replace(/पाव/g, '0.25').replace(/paav/g, '0.25')
      .replace(/सवा/g, '1.25').replace(/sawa/g, '1.25')
      .replace(/डेढ़/g, '1.5').replace(/dedh/g, '1.5')
      .replace(/ढाई/g, '2.5').replace(/dhai/g, '2.5');

    const words = text.split(/\s+/).filter(w => w.length > 0);
    const items: any[] = [];

    const unitMap: any = {
      kg: "kg", kilo: "kg", kilos: "kg", 'किलो': "kg",
      g: "g", gram: "g", grams: "g", 'ग्राम': "g",
      l: "l", liter: "l", litre: "l", litres: "l", 'लीटर': "l",
      ml: "ml", mili: "ml", 'मिली': "ml",
      pc: "pc", pcs: "pc", piece: "pc", packet: "pc", pkt: "pc", pack: "pc", 'पैकेट': "pc", 'पीस': "pc"
    };

    const numMap: any = {
      'एक': 1, 'do': 2, 'दो': 2, 'dui': 2, 'दुई': 2, 'teen': 3, 'तीन': 3, 'char': 4, 'चार': 4, 'paanch': 5, 'पांच': 5,
      'che': 6, 'छह': 6, 'chhe': 6, 'chay': 6, 'छय': 6, 'saat': 7, 'सात': 7, 'aath': 8, 'आठ': 8, 'nau': 9, 'नौ': 9, 'das': 10, 'दस': 10,
      'gyarah': 11, 'ग्यारह': 11, 'barah': 12, 'बारह': 12, 'bara': 12, 'बारा': 12,
      'tera': 13, 'तेरा': 13, 'तेरह': 13, 'chauda': 14, 'चौदह': 14, 'चौदा': 14,
      'pandrah': 15, 'पंद्रह': 15, 
      'bees': 20, 'बीस': 20, 'ikkis': 21, 'इक्कीस': 21, 'ikais': 21, 'इकाईस': 21,
      'bais': 22, 'बाइस': 22, 'teis': 23, 'तेइस': 23, 'chaubis': 24, 'चौबीस': 24,
      'pachees': 25, 'पच्चीस': 25, 'tees': 30, 'तीस': 30,
      'aadha': 0.5, 'आधा': 0.5, 'paav': 0.25, 'पाव': 0.25, 'sawa': 1.25, 'सवा': 1.25,
      'dedh': 1.5, 'डेढ़': 1.5, 'dhai': 2.5, 'ढाई': 2.5,
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'half': 0.5, 'quarter': 0.25
    };

    let pendingName: string[] = [];
    let pendingQty = 1;
    let pendingUnit = "pc";
    let hasLeadingNumber = false;

    const commitItem = (overrideQty?: number, overrideUnit?: string) => {
      if (pendingName.length > 0) {
        items.push({
          name: pendingName.join(" "),
          quantity: overrideQty !== undefined ? overrideQty : pendingQty,
          unit: overrideUnit !== undefined ? overrideUnit : pendingUnit,
        });
      }
      pendingName = [];
      pendingQty = 1;
      pendingUnit = "pc";
      hasLeadingNumber = false;
    };

    const hasNameAhead = (startIndex: number) => {
      for (let j = startIndex; j < words.length; j++) {
        const w = words[j];
        if (unitMap[w]) continue;
        let isNum = false;
        if (!isNaN(Number(w))) isNum = true;
        else if (numMap[w] !== undefined) isNum = true;
        else {
          const match = w.match(/^([\d\.]+)([a-zA-Z]+|किलो|ग्राम|लीटर|पैकेट|पीस)$/i);
          if (match) isNum = true;
        }
        if (!isNum) return true;
      }
      return false;
    };

    let i = 0;
    while (i < words.length) {
      const word = words[i];
      const nextWord = words[i + 1] || "";

      let isNumber = false;
      let parsedNum = NaN;
      let isCombined = false;
      let parsedUnitStr = "";

      if (!isNaN(Number(word))) {
          isNumber = true;
          parsedNum = parseFloat(word);
      } else if (numMap[word] !== undefined) {
          isNumber = true;
          parsedNum = numMap[word];
      }

      if (isNumber) {
        parsedUnitStr = unitMap[nextWord] || "";
      } else {
        const match = word.match(/^([\d\.]+)([a-zA-Z]+|किलो|ग्राम|लीटर|पैकेट|पीस)$/i);
        if (match) {
           parsedNum = parseFloat(match[1]);
           if (unitMap[match[2]]) {
               parsedUnitStr = unitMap[match[2]];
               isNumber = true;
               isCombined = true;
           }
        }
      }

      if (isNumber && !isNaN(parsedNum)) {
        let finalUnit = parsedUnitStr || "pc";
        
        if (pendingName.length > 0) {
          if (hasLeadingNumber) {
            const nextWordIndex = i + (isCombined ? 1 : (parsedUnitStr ? 2 : 1));
            if (hasNameAhead(nextWordIndex)) {
              commitItem();
              pendingQty = parsedNum;
              pendingUnit = finalUnit;
              hasLeadingNumber = true;
            } else {
              pendingQty = parsedNum;
              pendingUnit = finalUnit;
              commitItem();
            }
          } else {
            commitItem(parsedNum, finalUnit);
          }
        } else {
          pendingQty = parsedNum;
          pendingUnit = finalUnit;
          hasLeadingNumber = true;
        }

        if (parsedUnitStr && !isCombined) {
           i++; 
        }
      } else {
        if (unitMap[word] && pendingName.length === 0) {
           pendingUnit = unitMap[word];
        } else {
           pendingName.push(word);
        }
      }
      i++;
    }

    commitItem();
    return items;
  };

  const processVoiceTextToItems = (text: string) => {
    if (!text || text.trim().length === 0) return [];
    const parsedItems = parseVoiceItems(text);
    
    // PHASE 2: NORMALIZATION LAYER
    const normalizedItems = parsedItems.map(item => {
      const cleanName = String(item.name || '').trim().toLowerCase();
      let normalizedUnit = String(item.unit || '').trim().toLowerCase();
      if (['g', 'gm', 'grams', 'gram', 'ग्राम'].includes(normalizedUnit)) normalizedUnit = 'g';
      else if (['kg', 'kilo', 'kilos', 'किलो'].includes(normalizedUnit)) normalizedUnit = 'kg';
      else if (['litre', 'litres', 'l', 'ltr', 'लीटर'].includes(normalizedUnit)) normalizedUnit = 'l';
      else if (['packet', 'pack', 'pkt', 'pc', 'pcs', 'piece', 'पैकेट', 'पीस'].includes(normalizedUnit)) normalizedUnit = 'pc';
      else if (!normalizedUnit) normalizedUnit = 'pc';
      const cleanQuantity = (item.quantity && !isNaN(item.quantity) && item.quantity > 0) ? item.quantity : 1;

      return {
        ...item,
        name: cleanName,
        quantity: cleanQuantity,
        unit: normalizedUnit
      };
    });

    // PHASE 3: CONNECT WITH EXISTING CATALOG (FORGIVING MODE)
    const fuse = new Fuse(catalog, {
      keys: ['name', 'localName'],
      threshold: 0.6,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2
    });

    const seenItemsMap = new Set();

    const matchedItems = normalizedItems.map(item => {
      const searchName = item.name.replace(/\d+/g, '').replace(/\b(kg|g|ml|l|ltr|pcs?|pieces?|pkt|pack|packet|day|meter|m)\b/gi, '').trim();
      const result = fuse.search(searchName);
      let bestMatch: any = null;

      // Forgiving direct hit check to allow typos
      if (result.length && (result[0].score ?? 1) <= 0.6) {
        bestMatch = result[0].item;
      }

      // Smart Fallback: If full phrase fails due to stuttering (e.g. "टॉफी ट्रॉफी"), try matching individual words
      if (!bestMatch) {
          const words = searchName.split(/\s+/);
          for (const w of words) {
              if (w.length > 2) {
                  const subResult = fuse.search(w);
                  if (subResult.length && (subResult[0].score ?? 1) <= 0.4) {
                      bestMatch = subResult[0].item;
                      break;
                  }
              }
          }
      }

      const key = (bestMatch?.id || item.name).toLowerCase();
      let isRepeated = false;
      if (seenItemsMap.has(key)) {
        isRepeated = true;
      } else {
        seenItemsMap.add(key);
      }

      // PHASE 5: REJECTION SYSTEM
      if (!bestMatch) {
        return {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          price: 0,
          costPrice: 0,
          productId: null,
          confidence: 'low',
          aiLabel: item.name,
          isRepeated
        };
      }

      // PHASE 4: FINAL SAFE OUTPUT
      const match = bestMatch;
      let finalQty = item.quantity;
      let finalUnit = item.unit || 'pc';
      const baseUnit = match.baseUnit || 'pc';
      const baseQty = match.baseQuantity || 1;

      if (item.unit === 'g') {
          if (baseUnit === 'kg') {
              finalQty = finalQty / 1000;
              finalUnit = 'kg';
          } else if (baseUnit === 'pc') {
              // User said 'g', but DB is 'pc' (packet). Calculate packets!
              if (baseQty > 1) { // Assuming baseQty is packet weight in grams
                  finalQty = Math.max(1, Math.round(finalQty / baseQty));
                  finalUnit = 'pc';
              } else {
                  finalUnit = 'g';
              }
          } else if (baseUnit === 'g') {
              if (baseQty > 1) {
                  finalQty = Math.max(1, Math.round(finalQty / baseQty));
                  finalUnit = 'pc';
              } else {
                  finalUnit = 'g';
              }
          }
      } else if (item.unit === 'ml') {
          if (baseUnit === 'l') {
              finalQty = finalQty / 1000;
              finalUnit = 'l';
          } else if (baseUnit === 'pc') {
              if (baseQty > 1) {
                  finalQty = Math.max(1, Math.round(finalQty / baseQty));
                  finalUnit = 'pc';
              } else {
                  finalUnit = 'ml';
              }
          } else if (baseUnit === 'ml') {
              if (baseQty > 1) {
                  finalQty = Math.max(1, Math.round(finalQty / baseQty));
                  finalUnit = 'pc';
              } else {
                  finalUnit = 'ml';
              }
          }
      } else if (item.unit === 'kg') {
          if (baseUnit === 'pc') {
              if (baseQty > 1) { // baseQty is in grams
                  finalQty = Math.max(1, Math.round((finalQty * 1000) / baseQty));
                  finalUnit = 'pc';
              } else {
                  finalUnit = 'kg';
              }
          } else if (baseUnit === 'kg') {
              if (baseQty > 1) {
                  finalQty = Math.max(1, Math.round(finalQty / baseQty));
                  finalUnit = 'pc';
              } else {
                  finalUnit = 'kg';
              }
          }
      } else if (item.unit === 'l') {
          if (baseUnit === 'pc') {
              if (baseQty > 1) { // baseQty is in ml
                  finalQty = Math.max(1, Math.round((finalQty * 1000) / baseQty));
                  finalUnit = 'pc';
              } else {
                  finalUnit = 'l';
              }
          } else if (baseUnit === 'l') {
              if (baseQty > 1) {
                  finalQty = Math.max(1, Math.round(finalQty / baseQty));
                  finalUnit = 'pc';
              } else {
                  finalUnit = 'l';
              }
          }
      } else {
        // Mismatch between spoken unit and base unit without a conversion rule
        // Keep the spoken unit so UI accurately reflects what was heard!
        finalUnit = item.unit;
      }

      return {
        productId: match.id,
        name: match.name, // Safely mapped exactly from Database Output
        localName: match.localName,
        imageUrl: match.imageUrl,
        quantity: finalQty,
        unit: finalUnit,
        baseUnit: match.baseUnit,
        baseQuantity: match.baseQuantity,
        packetWeight: match.packetWeight,
        packetUnit: match.packetUnit,
        price: match.price,
        costPrice: match.costPrice,
        confidence: 'high',
        hasExplicitQty: true,
        aiLabel: match.name,
        isRepeated
      };
    });

    return matchedItems;
  };

  const getSuggestions = (item: any) => {
    if (!item.productId) return [];
    
    // Use first word of the product name for a broader search
    const searchWord = (item.name || '').split(' ')[0].toLowerCase();
    
    return catalog.filter(product => {
      if (product.id === item.productId) return false;
      
      const prodName = (product.name || '').toLowerCase();
      const prodLocal = (product.localName || '').toLowerCase();
      const itemLocal = (item.localName || '').toLowerCase();
      
      return (itemLocal && prodLocal === itemLocal) || prodName.includes(searchWord);
    }).slice(0, 5);
  };

  const startVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported");
      return;
    }

    baseReviewItemsRef.current = [...reviewItems];
    itemOverridesRef.current = {};
    globalTranscriptRef.current = "";
    currentBreathRef.current = "";
    setFinalTranscript("");
    isListeningRef.current = true;
    setIsListening(true);

    const initMic = () => {
        if (!isListeningRef.current) return;
        
        const recognition = new SpeechRecognition();
        recognition.lang = "hi-IN";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
            let merged = "";
            for (let i = 0; i < event.results.length; ++i) {
                const text = event.results[i][0].transcript.trim();
                if (!text) continue;
                merged = mergeOverlappingStrings(merged, text);
            }
            
            currentBreathRef.current = merged;
            const fullText = mergeOverlappingStrings(globalTranscriptRef.current, merged);
            setFinalTranscript(fullText);
            
            if (fullText.length > 1) {
                const newParsedItems = processVoiceTextToItems(fullText);
                if (newParsedItems.length > 0) {
                    const enrichedItems = newParsedItems.map((item: any) => {
                        let finalItem = item;
                        if (item.aiLabel && itemOverridesRef.current[item.aiLabel]) {
                            finalItem = { ...finalItem, ...itemOverridesRef.current[item.aiLabel] };
                        }
                        return {
                            ...finalItem,
                            suggestions: getSuggestions(finalItem)
                        };
                    });
                    
                    const allItems = [...baseReviewItemsRef.current, ...enrichedItems];
                    
                    // Only keep suggestions for the most recently spoken item
                    const finalItems = allItems.map((item, idx) => {
                        if (idx === allItems.length - 1) return item;
                        return { ...item, suggestions: [] };
                    });

                    setReviewItems(finalItems);
                    setIsReviewing(true);
                }
            }
        };

        recognition.onerror = (e: any) => {
            console.error("Speech Error:", e.error || e);
            if (e.error === 'not-allowed' || e.error === 'audio-capture') {
                setIsListening(false);
                isListeningRef.current = false;
                alert("Microphone error: Please check permissions or hardware.");
            }
        };

        recognition.onend = () => {
            if (isListeningRef.current) {
                globalTranscriptRef.current = mergeOverlappingStrings(globalTranscriptRef.current, currentBreathRef.current);
                currentBreathRef.current = "";
                
                // Re-create the recognition object to bypass Android Chrome zombie state bug
                setTimeout(() => {
                    initMic();
                }, 10);
            } else {
                globalTranscriptRef.current = mergeOverlappingStrings(globalTranscriptRef.current, currentBreathRef.current);
                currentBreathRef.current = "";
            }
        };

        try {
            recognition.start();
            recognitionRef.current = recognition;
        } catch(e) {
            console.error("Failed to start mic:", e);
            setTimeout(() => {
                if (isListeningRef.current) {
                    initMic();
                }
            }, 250);
        }
    };

    initMic();
  };

  const stopVoiceInput = () => {
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }
  };

  const router = useRouter();
  const [shop, setShop] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [mode, setMode] = useState<'MANUAL' | 'OCR' | 'PENDING'>('MANUAL');

  // Cart state
  const [cart, setCart] = useState<any[]>([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', paymentMethod: 'CASH', status: 'PAID' });
  const [savingBill, setSavingBill] = useState(false);

  // Manual Mode state
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Pending Bills state
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [completedBills, setCompletedBills] = useState<any[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);

  // AI/OCR state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reviewEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reviewEndRef.current) {
        reviewEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [reviewItems.length]);

  useEffect(() => {
    fetch('/api/shop').then(r => r.json()).then(data => {
      if (data && !data.error) {
        setShop(data);
        if (data?.id) {
          fetchCatalog(data.id);
          fetchBills(data.id);
        }
      } else {
        setShop({ error: true });
      }
    });
  }, []);

  const fetchCatalog = async (shopId: string) => {
    const res = await fetch(`/api/products?shopId=${shopId}`);
    if (res.ok) setCatalog(await res.json());
  };

  const fetchBills = async (shopId: string) => {
    try {
      setLoadingBills(true);
      const res = await fetch(`/api/bills?shopId=${shopId}`);
      if (res.ok) {
        const allBills = await res.json();
        const pending = allBills.filter((b: any) => b.orderStatus === 'PENDING');
        const completed = allBills.filter((b: any) => b.orderStatus === 'COMPLETED').slice(0, 3);
        setPendingBills(pending);
        setCompletedBills(completed);
      }
    } catch (error) {
      console.error('Failed to fetch bills:', error);
    } finally {
      setLoadingBills(false);
    }
  };

  useEffect(() => {
    if (search.length > 1) {
      setSearchResults(catalog.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.localName && p.localName.toLowerCase().includes(search.toLowerCase())) ||
        (p.barcode && p.barcode.includes(search))
      ));
    } else {
      setSearchResults([]);
    }
  }, [search, catalog]);

  const addToCart = (product: any, qty: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && item.unit === product.baseUnit);
      if (existing) {
        return prev.map(item => item === existing ? { ...item, quantity: item.quantity + qty } : item);
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        localName: product.localName || null,
        imageUrl: product.imageUrl || null,
        price: product.price || 0,
        costPrice: product.costPrice || 0,
        unit: product.baseUnit || 'pc',
        baseUnit: product.baseUnit || 'pc',
        baseQuantity: product.baseQuantity || 1,
        packetWeight: product.packetWeight || null,
        packetUnit: product.packetUnit || null,
        quantity: qty
      }];
    });

    setSearch('');
  };

  const updateCartItem = (index: number, field: string, value: any) => {
    const newCart = [...cart];
    newCart[index] = { ...newCart[index], [field]: value };
    setCart(newCart);
  };

  const removeFromCart = (index: number) => setCart(cart.filter((_, i) => i !== index));

  const calculateItemTotal = (item: any) => {
    const isTentHouse = shop?.businessType?.name === 'Tent House';
    const baseUnit = item.baseUnit || 'pc';
    const scannedUnit = item.unit || baseUnit;
    const baseQuantity = item.baseQuantity || 1;
    const price = item.price || 0;

    if (isTentHouse) {
      return item.quantity * price;
    }

    if (baseUnit === 'pkt' && item.packetWeight && (scannedUnit === 'kg' || scannedUnit === 'g' || scannedUnit === 'l' || scannedUnit === 'ml' || scannedUnit === 'ltr')) {
       let qBase = item.quantity;
       if (scannedUnit === 'kg' || scannedUnit === 'ltr' || scannedUnit === 'l') qBase *= 1000;

       let pktWeightBase = item.packetWeight;
       if (item.packetUnit === 'kg' || item.packetUnit === 'ltr' || item.packetUnit === 'l') pktWeightBase *= 1000;

       const packetsNeeded = qBase / pktWeightBase;
       return packetsNeeded * price;
    }

    if (baseUnit === 'pc' || scannedUnit === 'pc' || baseUnit === 'pkt' || scannedUnit === 'pkt') return item.quantity * price;

    let qBase = item.quantity;
    if (scannedUnit === 'kg' || scannedUnit === 'ltr') qBase *= 1000;

    let bBase = baseQuantity;
    if (baseUnit === 'kg' || baseUnit === 'ltr') bBase *= 1000;

    return (qBase / bBase) * price;
  };

  const totalAmount = cart.reduce((acc, item) => acc + calculateItemTotal(item), 0);

  const handleGenerateBill = async (overrideInfo?: any) => {
    // Determine if overrideInfo is a valid object (and not a React click event)
    const infoToUse = (overrideInfo && !overrideInfo.type) ? overrideInfo : customerInfo;

    if (cart.length === 0) return alert('Cart is empty!');
    setSavingBill(true);

    const payload = {
      shopId: shop.id,
      items: cart,
      ...infoToUse,
    };

    const res = await fetch('/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const bill = await res.json();
      
      // Generate WhatsApp message if customer phone is available
      if (infoToUse.phone) {
        // Calculate total amount
        const totalAmount = cart.reduce((acc, item) => acc + calculateItemTotal(item), 0);
        
        // Prepare cart items with calculated totals for message
        const cartItemsForMessage = cart.map(item => ({
          ...item,
          itemTotal: calculateItemTotal(item)
        }));
        
        // Generate the WhatsApp message
        const whatsappMessage = generateWhatsAppMessage(
          shop.name || 'Kirana Store',
          cartItemsForMessage,
          totalAmount
        );
        
        // Open WhatsApp chat with pre-filled message
        openWhatsAppChat(infoToUse.phone, whatsappMessage);
      }
      
      router.push(`/history`);
    } else {
      alert('Failed to generate bill');
    }
    setSavingBill(false);
  };

  // AI & OCR Common Logic
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const processImage = async () => {
    if (!file) return;
    setIsProcessing(true);

    const compressImage = (imageFile: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
        };
      });
    };

    try {
      const base64 = await compressImage(file);
      const endpoint = mode === 'OCR' ? '/api/vision/ocr' : '/api/vision/analyze';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, shopId: shop.id })
      });
      const data = await res.json();

      if (!res.ok) {
        setReviewItems([{ name: `Engine Error: ${data.error || 'Server failed'}`, quantity: 0, unit: '', price: 0, productId: null, isRepeated: false }]);
        setIsReviewing(true);
        setIsProcessing(false);
        return;
      }

      if (data.items && data.items.length > 0) {
        setReviewItems(data.items);
        setIsReviewing(true);
      } else {
        setReviewItems([{ name: `Error: Could not detect any text/items in this image`, quantity: 0, unit: '', price: 0, productId: null, isRepeated: false }]);
        setIsReviewing(true);
      }
    } catch (err: any) {
      setReviewItems([{ name: `Network Error: ${err.message}`, quantity: 0, unit: '', price: 0, productId: null, isRepeated: false }]);
      setIsReviewing(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmReview = () => {
    // Merge valid review items into cart
    const validItems = reviewItems.filter(item => item.name && (item.price > 0 || item.sellingPrice > 0)).map(i => ({
      ...i,
      price: i.price || i.sellingPrice || 0,
      baseUnit: i.baseUnit || i.unit || 'pc',
      baseQuantity: i.baseQuantity || ((i.baseUnit === 'g' || i.baseUnit === 'ml') ? 100 : 1)
    }));
    setCart(prev => [...prev, ...validItems]);
    setIsReviewing(false);
    setFile(null);
    setPreviewUrl(null);
    setReviewItems([]);
    
    if (isListeningRef.current) {
      stopVoiceInput();
    }
  };

  if (!shop) return <div className="p-8 text-center mt-20">Loading...</div>;
  if (shop.error) return (
    <div className="p-8 max-w-lg mx-auto mt-20 text-center space-y-6">
      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-xl text-left shadow-sm">
        <h2 className="text-xl font-bold mb-2">Database Error / Shop Not Found</h2>
        <p>Could not connect to Firebase, or you haven't set up a shop yet.</p>
        <p className="mt-2 text-sm text-rose-600">Please make sure you have configured your Firebase environment variables in <code className="bg-rose-100 px-1 py-0.5 rounded">.env</code> and completed the shop setup!</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 h-full">

      {/* Left Panel: Modes & Input */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100">
            <TabButton active={mode === 'MANUAL'} onClick={() => setMode('MANUAL')} icon={<Search size={18} />} label="Manual Search" />
            <TabButton active={mode === 'OCR'} onClick={() => setMode('OCR')} icon={<FileText size={18} />} label="Scan Slip" />
            <TabButton active={mode === 'PENDING'} onClick={() => setMode('PENDING')} icon={<ShoppingCart size={18} />} label="Pending Bills" />
          </div>

          <div className="p-6">
            {/* 🎤 Voice Button Container (Always Visible) */}
            <div className="mb-6 space-y-3">
              <button
                onClick={isListening ? stopVoiceInput : startVoiceInput}
                className={`w-full text-white font-semibold py-4 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 ${
                  isListening 
                    ? 'bg-rose-500 hover:bg-rose-600 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isListening ? (
                  <>⏹ Stop Listening</>
                ) : (
                  <>🎤 Start Speaking</>
                )}
              </button>
              
              {isListening && finalTranscript && (
                 <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-inner">
                   <p className="text-sm font-medium text-slate-400 mb-1 flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span> Live Input:
                   </p>
                   <p className="text-slate-700 text-lg">{finalTranscript}</p>
                 </div>
              )}
            </div>

            {mode === 'MANUAL' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search catalog by name or barcode... (e.g. Tata Salt)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-lg shadow-sm"
                  />
                </div>
                
                {/* Blinkit-style Grid Layout */}
                <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto">
                  {(() => {
                    const productsToDisplay = search.length > 1 ? searchResults : catalog.slice(0, 100);
                    
                    if (productsToDisplay.length === 0) {
                      return <div className="p-8 text-slate-500 text-center">No products found.</div>;
                    }

                    // Group products by category
                    const groupedByCategory = productsToDisplay.reduce((acc, product) => {
                      const category = product.category || 'Uncategorized';
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(product);
                      return acc;
                    }, {} as Record<string, any[]>);

                    const categories = Object.keys(groupedByCategory).sort();

                    return (
                      <div className="space-y-6 p-4">
                        {categories.map((category) => (
                          <div key={category}>
                            {/* Category Header */}
                            <h3 className="text-sm font-bold text-slate-900 mb-3 px-2">{category}</h3>
                            
                            {/* Products Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {groupedByCategory[category].map((p) => {
                                const cartItem = cart.find(c => c.productId === p.id && c.unit === p.baseUnit);
                                const qty = cartItem ? cartItem.quantity : 0;
                                
                                return (
                                  <div
                                    key={p.id}
                                    className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-all hover:border-slate-300"
                                  >
                                    {/* Product Image */}
                                    <div className="relative w-full h-24 bg-slate-100 overflow-hidden flex items-center justify-center">
                                      {p.imageUrl ? (
                                        <img
                                          src={p.imageUrl}
                                          alt={p.name}
                                          className="w-full h-full object-cover hover:scale-105 transition"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                                          <Package className="text-slate-400" size={24} />
                                        </div>
                                      )}
                                    </div>

                                    {/* Product Info */}
                                    <div className="p-2.5">
                                      {/* Name */}
                                      <h4 className="font-semibold text-slate-900 text-xs line-clamp-2 mb-1">
                                        {p.name}
                                      </h4>

                                      {/* Price */}
                                      <div className="mb-2">
                                        <div className="text-sm font-bold text-emerald-600">
                                          ₹{(p.price || 0).toFixed(2)}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                          {p.baseQuantity === 1 ? '' : p.baseQuantity}{p.baseUnit}
                                        </div>
                                      </div>

                                      {/* Add/Quantity Button */}
                                      {qty > 0 ? (
                                        <div className="flex items-center gap-1 bg-indigo-50 px-1.5 py-1 rounded-lg border border-indigo-100 shadow-inner">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const i = cart.indexOf(cartItem);
                                              qty <= 1 ? removeFromCart(i) : updateCartItem(i, 'quantity', qty - 1);
                                            }}
                                            className="w-6 h-6 flex items-center justify-center bg-white text-indigo-600 rounded text-xs font-bold hover:bg-indigo-100 transition"
                                          >
                                            −
                                          </button>
                                          <span className="font-semibold text-xs text-center flex-1 text-indigo-900">
                                            {qty}
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateCartItem(cart.indexOf(cartItem), 'quantity', qty + 1);
                                            }}
                                            className="w-6 h-6 flex items-center justify-center bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 transition"
                                          >
                                            +
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            addToCart(p);
                                          }}
                                          className="w-full text-indigo-600 bg-indigo-50 px-2 py-1.5 rounded-lg font-semibold hover:bg-indigo-100 transition-colors text-xs flex items-center justify-center gap-1"
                                        >
                                          <Plus size={14} /> Add
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {(mode === 'OCR') && !isReviewing && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Upload Customer List slip</h3>
                  <p className="text-slate-500 text-sm mb-4">
                    We'll read handwritten or printed text and match it.
                  </p>
                </div>

                <div
                  className="border-2 border-dashed border-indigo-200 rounded-2xl p-8 bg-indigo-50/50 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 transition"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="max-h-64 rounded-xl shadow-sm" />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-indigo-600">
                      <Camera size={48} />
                      <span className="font-semibold">Tap to capture or upload image</span>
                    </div>
                  )}
                </div>

                {file && (
                  <button
                    disabled={isProcessing}
                    onClick={processImage}
                    className="w-full bg-indigo-600 text-white font-semibold py-4 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing AI...' : 'Analyze Image'}
                  </button>
                )}
              </div>
            )}

            {mode === 'PENDING' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">Pending Orders</h3>
                  <p className="text-slate-500 text-sm mb-4">
                    Orders waiting to be fulfilled
                  </p>
                </div>

                {loadingBills ? (
                  <div className="text-center py-8 text-slate-500">Loading orders...</div>
                ) : pendingBills.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No pending orders</div>
                ) : (
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                    {pendingBills.map((bill) => (
                      <div 
                        key={bill.id} 
                        onClick={() => setSelectedBill(bill)}
                        className="p-4 border border-amber-200 bg-amber-50 rounded-xl cursor-pointer hover:bg-amber-100 hover:border-amber-300 transition"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-slate-900">{bill.billNumber}</p>
                            <p className="text-xs text-slate-500">{new Date(bill.createdAt).toLocaleTimeString()}</p>
                          </div>
                          <span className="bg-amber-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold">PENDING</span>
                        </div>
                        <div className="text-sm text-slate-700 mb-2">
                          {bill.items?.length || 0} items • ₹{bill.totalAmount?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-slate-200 pt-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Recent Completed Orders</h4>
                  {completedBills.length === 0 ? (
                    <div className="text-center py-4 text-slate-500 text-sm">No completed orders yet</div>
                  ) : (
                    <div className="space-y-2">
                      {completedBills.map((bill) => (
                        <div 
                          key={bill.id} 
                          onClick={() => setSelectedBill(bill)}
                          className="p-3 border border-emerald-200 bg-emerald-50 rounded-lg cursor-pointer hover:bg-emerald-100 hover:border-emerald-300 transition"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-slate-900 text-sm">{bill.billNumber}</p>
                              <p className="text-xs text-slate-500">{new Date(bill.createdAt).toLocaleTimeString()}</p>
                            </div>
                            <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-xs font-semibold">✓ DONE</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">₹{bill.totalAmount?.toFixed(2) || '0.00'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(mode === 'OCR') && isReviewing && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold flex items-center gap-2"><CheckCircle className="text-emerald-500" /> Review Detected Items</h3>
                  <button onClick={() => setIsReviewing(false)} className="text-sm text-slate-500 hover:text-slate-800">Cancel</button>
                </div>

                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                  {reviewItems.map((item, idx) => (
                    <div key={idx} className={`p-4 border rounded-xl flex flex-col gap-3 transition-colors ${item.isRepeated ? 'border-amber-400 bg-amber-50 shadow-[0_0_12px_rgba(251,191,36,0.3)] relative' : item.productId ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50/30'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3 flex-1 items-start">
                          <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <Package className="text-slate-300" size={24}/>}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                            <input
                              value={item.name}
                              onChange={e => {
                                const newItems = [...reviewItems]; newItems[idx].name = e.target.value; setReviewItems(newItems);
                              }}
                              className="font-semibold w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none"
                              placeholder="Product Name"
                            />
                            {item.localName && <span className="text-sm text-slate-500 whitespace-nowrap">({item.localName})</span>}
                            {item.isRepeated && (
                              <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] uppercase tracking-wider font-extrabold rounded shadow-sm whitespace-nowrap absolute -top-2 right-4 rotate-3">
                                Repeated
                              </span>
                            )}
                          </div>
                          {item.confidence === 'low' ? (
                            <p className="text-xs text-rose-600 flex items-center gap-1 mt-1"><TriangleAlert size={12} /> Unrecognized - Update details</p>
                          ) : (
                            <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1"><CheckCircle size={12} /> AI Matched: {item.aiLabel || 'Catalog'}</p>
                          )}
                        </div>
                        </div>
                        <button onClick={() => setReviewItems(reviewItems.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-rose-500"><X size={20} /></button>
                      </div>
                      <div className="flex gap-4 items-center">
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shrink-0">
                          <button onClick={() => { const n = [...reviewItems]; n[idx].quantity = Math.max(1, n[idx].quantity - 1); setReviewItems(n); }} className="px-3 py-1 bg-slate-50 hover:bg-slate-100">-</button>
                          <input type="number" className="w-14 text-center text-sm font-semibold focus:outline-none p-1" value={item.quantity} onChange={e => { const n = [...reviewItems]; n[idx].quantity = parseFloat(e.target.value) || 1; setReviewItems(n); }} />
                          <span className="text-xs bg-slate-100 px-1 py-1 text-slate-400 font-medium">{item.unit || item.baseUnit}</span>
                          <button onClick={() => { const n = [...reviewItems]; n[idx].quantity += 1; setReviewItems(n); }} className="px-3 py-1 bg-slate-50 hover:bg-slate-100">+</button>
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-slate-500 text-sm">₹</span>
                          <input
                            type="number"
                            className="w-20 border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:border-indigo-500 text-sm"
                            value={item.price || item.sellingPrice || 0}
                            onChange={e => { const n = [...reviewItems]; n[idx].price = parseFloat(e.target.value) || 0; setReviewItems(n); }}
                          />
                        </div>
                      </div>

                      {item.suggestions && item.suggestions.length > 0 && (
                        <div className="mt-2 pt-3 border-t border-slate-200/60">
                          <p className="text-xs font-semibold text-slate-500 mb-2">Similar Items Available:</p>
                          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                            {item.suggestions.map((sug: any, sIdx: number) => (
                              <button
                                key={sIdx}
                                onClick={() => {
                                  const overrides = {
                                    productId: sug.id,
                                    name: sug.name,
                                    localName: sug.localName,
                                    price: sug.price,
                                    baseUnit: sug.baseUnit,
                                    baseQuantity: sug.baseQuantity,
                                    packetWeight: sug.packetWeight,
                                    packetUnit: sug.packetUnit,
                                    imageUrl: sug.imageUrl
                                  };
                                  
                                  if (item.aiLabel) {
                                      itemOverridesRef.current[item.aiLabel] = overrides;
                                  }

                                  const newItems = [...reviewItems];
                                  newItems[idx] = {
                                    ...newItems[idx],
                                    ...overrides
                                  };
                                  setReviewItems(newItems);
                                }}
                                className="flex-shrink-0 bg-white border border-indigo-100 rounded-lg p-2 text-left hover:bg-indigo-50 hover:border-indigo-300 transition-colors w-44 flex items-center gap-2"
                              >
                                <div className="w-8 h-8 rounded bg-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                                  {sug.imageUrl ? <img src={sug.imageUrl} className="w-full h-full object-cover" /> : <Package className="text-slate-300" size={14}/>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-slate-800 line-clamp-1">{sug.name}</p>
                                  <p className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                                    ₹{(sug.price || 0).toFixed(2)} / {sug.baseQuantity || 1} {(sug.baseUnit || sug.unit) === 'pkt' ? 'packet' : (sug.baseUnit || sug.unit || 'pc')}
                                    {sug.packetWeight ? ` (${sug.packetWeight}${sug.packetUnit || 'g'})` : ''}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={reviewEndRef} />
                </div>

                <button
                  onClick={confirmReview}
                  className="w-full bg-emerald-600 text-white font-semibold py-4 rounded-xl hover:bg-emerald-700 transition"
                >
                  Confirm & Add to Bill ({reviewItems.length} items)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: Current Bill / Cart */}
      <div className="w-full lg:w-96 flex flex-col bg-slate-900 rounded-2xl shadow-xl overflow-hidden text-white flex-shrink-0">
        <div className="p-6 bg-slate-800 border-b border-slate-700/50 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart size={20} className="text-indigo-400" /> Current Bill</h2>
          <span className="bg-indigo-600/20 text-indigo-400 px-3 py-1 rounded-full text-sm font-semibold">{cart.length} items</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
              <ShoppingCart size={48} className="opacity-20" />
              <p>Your cart is empty.</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="bg-slate-800 p-3 rounded-xl border border-slate-700 relative group flex gap-3">
                <div className="w-12 h-12 rounded bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center border border-slate-600">
                  {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover opacity-90" /> : <Package className="text-slate-500" size={20}/>}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start pr-6">
                    <div>
                      <p className="font-semibold text-sm line-clamp-1">
                        {item.name} {item.localName && <span className="text-indigo-300 font-normal ml-1">({item.localName})</span>}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5">₹{(item.price || 0).toFixed(2)} / {item.baseQuantity === 1 ? '' : item.baseQuantity}{item.baseUnit || item.unit}</p>
                    </div>
                    <p className="font-bold text-indigo-300">₹{calculateItemTotal(item).toFixed(2)}</p>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center bg-slate-900 rounded-md border border-slate-700 h-8">
                      <button onClick={() => updateCartItem(idx, 'quantity', Math.max(0.5, item.quantity - 1))} className="px-2 py-1 text-slate-400 hover:text-white h-full">-</button>
                      <span className="px-3 text-sm font-medium w-auto text-center tabular-nums">{item.quantity} <span className="text-slate-400 text-xs">{item.unit || item.baseUnit}</span></span>
                      <button onClick={() => updateCartItem(idx, 'quantity', item.quantity + 1)} className="px-2 py-1 text-slate-400 hover:text-white h-full">+</button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => removeFromCart(idx)}
                  className="absolute top-3 right-3 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-800 border-t border-slate-700/50 space-y-4">
          <div className="flex justify-between items-center text-slate-400 text-sm">
            <span>Subtotal</span>
            <span>₹{totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-2xl font-bold border-b border-slate-700 pb-4">
            <span>Total</span>
            <span className="text-emerald-400">₹{totalAmount.toFixed(2)}</span>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Customer Name (Optional)"
              value={customerInfo.name}
              onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
            />
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              placeholder="Customer Phone (Optional)"
              value={customerInfo.phone}
              onChange={e => {
                const val = e.target.value.replace(/\D/g, '');
                const newInfo = { ...customerInfo, phone: val };
                setCustomerInfo(newInfo);
                if (val.length === 10) {
                  handleGenerateBill(newInfo);
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setCustomerInfo({ ...customerInfo, status: 'PAID' })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${customerInfo.status === 'PAID' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/50' : 'bg-slate-900 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}
              >
                Mark Paid
              </button>
              <button
                onClick={() => setCustomerInfo({ ...customerInfo, status: 'UNPAID' })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${customerInfo.status === 'UNPAID' ? 'bg-rose-600/20 text-rose-400 border border-rose-500/50' : 'bg-slate-900 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}
              >
                Unpaid
              </button>
            </div>

            <button
              disabled={savingBill || cart.length === 0}
              onClick={handleGenerateBill}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-500 transition shadow-lg shadow-indigo-900/50 disabled:opacity-50 disabled:shadow-none mt-2 text-lg flex items-center justify-center gap-2"
            >
              <CheckCircle size={24} />
              {savingBill ? 'Saving...' : 'Generate Bill'}
            </button>
          </div>
        </div>
      </div>

      {/* Bill Detail Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-slate-900">Bill Details</h2>
              <button
                onClick={() => setSelectedBill(null)}
                className="text-slate-500 hover:text-slate-700 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Bill Content */}
            <div className="p-8 space-y-6">
              {/* Shop Header */}
              <div className="text-center pb-6 border-b border-slate-200 border-dashed">
                <h1 className="text-3xl font-bold text-slate-900">{selectedBill.shop?.name || 'Kirana Store'}</h1>
                <p className="text-slate-500 mt-1">{selectedBill.shop?.address}</p>
                <p className="text-slate-500">Mobile: {selectedBill.shop?.mobile}</p>
              </div>

              {/* Bill Info */}
              <div className="flex justify-between py-6 border-b border-slate-200 border-dashed">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Bill To</p>
                  <p className="font-medium text-slate-900 mt-1">{selectedBill.customerName || 'Cash Customer'}</p>
                  {selectedBill.customerPhone && <p className="text-slate-600 text-sm">{selectedBill.customerPhone}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase font-semibold">Bill Info</p>
                  <p className="font-medium text-slate-900 mt-1">{selectedBill.billNumber}</p>
                  <p className="text-slate-600 text-sm">{new Date(selectedBill.createdAt).toLocaleString()}</p>
                  <p className={`text-xs mt-1 font-bold ${selectedBill.status === 'PAID' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {selectedBill.status}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-6">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-xs uppercase border-b border-slate-200">
                      <th className="pb-3 font-semibold">Item</th>
                      <th className="pb-3 font-semibold text-center">Qty</th>
                      <th className="pb-3 font-semibold text-right">Price</th>
                      <th className="pb-3 font-semibold text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedBill.items?.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-3">
                          <p className="font-medium text-slate-800">
                            {item.name} {item.localName && <span className="text-slate-500 font-normal ml-1">({item.localName})</span>}
                          </p>
                        </td>
                        <td className="py-3 text-center text-slate-600">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-3 text-right text-slate-600">
                          ₹{(item.price || item.sellingPrice || 0).toFixed(2)}
                        </td>
                        <td className="py-3 text-right font-medium text-slate-800">
                          ₹{(item.total || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="pt-4 flex flex-col items-end border-t border-slate-200 border-dashed">
                <div className="flex justify-between w-full max-w-xs text-lg font-bold">
                  <span className="text-slate-600">Total:</span>
                  <span className="text-slate-900">₹{(selectedBill.totalAmount || 0).toFixed(2)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-4 text-center w-full">Thank you for shopping with us!</p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-6 flex gap-3 justify-end">
              <button
                onClick={() => setSelectedBill(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium transition-colors border-b-2 ${active ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
