'use client';
import Fuse from 'fuse.js';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Camera, FileText, Upload, Plus, Minus, Trash, CheckCircle, TriangleAlert, ShoppingCart, X, Package } from 'lucide-react';
import { generateWhatsAppMessage, openWhatsAppChat } from '@/lib/whatsapp-utils';
import { getBillLabel, getBillNumber, getBillIdentifier } from '@/lib/bill-utils';

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
    setMode('OCR'); // auto-switch to Scan Slip tab so review list is visible

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Pending Bills state
  const [pendingBills, setPendingBills] = useState<any[]>([]);
  const [allPendingBills, setAllPendingBills] = useState<any[]>([]);
  const [showMorePending, setShowMorePending] = useState(false);
  const [completedBills, setCompletedBills] = useState<any[]>([]);
  const [unpaidBills, setUnpaidBills] = useState<any[]>([]);
  const [allCompletedBills, setAllCompletedBills] = useState<any[]>([]);
  const [allUnpaidBills, setAllUnpaidBills] = useState<any[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showMoreCompleted, setShowMoreCompleted] = useState(false);
  const [showMoreUnpaid, setShowMoreUnpaid] = useState(false);

  // AI/OCR state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const [showCartSheet, setShowCartSheet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reviewEndRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reviewEndRef.current) {
        reviewEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [reviewItems.length]);

  const modeIndex = mode === 'MANUAL' ? 0 : mode === 'PENDING' ? 1 : 2;
  const isProgrammaticScroll = useRef(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  const slide0Ref = useRef<HTMLDivElement>(null);
  const slide1Ref = useRef<HTMLDivElement>(null);
  const slide2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.style.transform = `translateX(-${modeIndex * 100}%)`;
    }
    // Scroll the newly active slide back to top
    const slideRefs = [slide0Ref, slide1Ref, slide2Ref];
    const activeSlide = slideRefs[modeIndex]?.current;
    if (activeSlide) {
      activeSlide.scrollTop = 0;
    }
  }, [modeIndex]);

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
        const completed = allBills.filter((b: any) => b.orderStatus === 'COMPLETED');
        const unpaid = allBills.filter((b: any) => b.status === 'UNPAID');
        
        setPendingBills(pending.slice(0, 5));
        setAllPendingBills(pending);
        setCompletedBills(completed.slice(0, 3));
        setAllCompletedBills(completed);
        setUnpaidBills(unpaid.slice(0, 3));
        setAllUnpaidBills(unpaid);
        setShowMoreCompleted(false);
        setShowMorePending(false);
        setShowMoreUnpaid(false);
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
    const price = Number(item.price) || 0;
    
    if (isTentHouse) {
      return item.quantity * price;
    }

    const baseUnit = (item.baseUnit || 'pc').toString().trim().toLowerCase();
    const scannedUnit = (item.unit || baseUnit).toString().trim().toLowerCase();
    const baseQuantity = Number(item.baseQuantity) || 1;

    const isPktBase = ['pkt', 'packet', 'pack', 'pc', 'pcs', 'piece'].includes(baseUnit);
    const isPktScanned = ['pkt', 'packet', 'pack', 'pc', 'pcs', 'piece'].includes(scannedUnit);
    const isWeightScanned = ['kg', 'g', 'gram', 'l', 'ml', 'ltr', 'liter', 'kilo'].includes(scannedUnit);
    const isWeightScanned1000 = ['kg', 'kilo', 'l', 'ltr', 'liter'].includes(scannedUnit);

    if (isPktBase && item.packetWeight && isWeightScanned) {
       let qBase = Number(item.quantity) || 0;
       if (isWeightScanned1000) qBase *= 1000;

       let pktWeightBase = Number(item.packetWeight) || 1;
       const pUnit = (item.packetUnit || 'g').toString().trim().toLowerCase();
       if (['kg', 'kilo', 'l', 'ltr', 'liter'].includes(pUnit)) pktWeightBase *= 1000;

       const packetsNeeded = qBase / pktWeightBase;
       return packetsNeeded * price;
    }

    if (isPktBase || isPktScanned) return (Number(item.quantity) || 0) * price;

    let qBase = Number(item.quantity) || 0;
    if (isWeightScanned1000) qBase *= 1000;

    let bBase = baseQuantity;
    const isBaseWeight1000 = ['kg', 'kilo', 'l', 'ltr', 'liter'].includes(baseUnit);
    if (isBaseWeight1000) bBase *= 1000;

    return bBase > 0 ? (qBase / bBase) * price : 0;
  };

  const totalAmount = cart.reduce((acc, item) => acc + calculateItemTotal(item), 0);

  const handleGenerateBill = async (overrideInfo?: any) => {
    // Determine if overrideInfo is a valid object (and not a React click event)
    const infoToUse = (overrideInfo && !overrideInfo.type) ? overrideInfo : customerInfo;

    if (cart.length === 0) return alert('Cart is empty!');

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
      
      // Open WhatsApp chat with pre-filled message (as fast as possible)
      openWhatsAppChat(infoToUse.phone, whatsappMessage);
    }

    const payload = {
      shopId: shop.id,
      items: cart,
      ...infoToUse,
    };

    // Instantly update UI without waiting for save
    setCart([]);
    setCustomerInfo({ name: '', phone: '', paymentMethod: 'CASH', status: 'PAID' });
    setMode('PENDING'); // Switch to pending orders instead of history page

    // Save in background
    fetch('/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(res => {
      if (res.ok) {
        // Refresh bills to show the new one in the pending tab
        fetchBills(shop.id);
      } else {
        alert('Failed to save bill on server.');
      }
    }).catch(err => {
      console.error("Failed to save bill", err);
      alert('Network error while saving bill.');
    });
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
    setShowCartSheet(true); // show cart bottom sheet after adding items
    
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6 h-full">

      {/* Main Panel */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1">
          <div className="flex border-b border-slate-100">
            <TabButton active={mode === 'MANUAL'} onClick={() => setMode('MANUAL')} icon={<Search size={18} />} label="Manual Search" />
            <TabButton active={mode === 'PENDING'} onClick={() => setMode('PENDING')} icon={<ShoppingCart size={18} />} label="Pending Bills" />
            <TabButton active={mode === 'OCR'} onClick={() => setMode('OCR')} icon={<FileText size={18} />} label="Scan Slip" />
          </div>

          {/* Transcript card - always above the slider */}
          {isListening && finalTranscript && (
            <div className="mx-6 mt-4 relative overflow-hidden rounded-2xl border border-rose-200/60 bg-gradient-to-br from-rose-50 via-white to-orange-50 shadow-sm">
              <div className="h-0.5 w-full bg-gradient-to-r from-rose-400 via-orange-400 to-rose-400" />
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-rose-500">Listening</span>
                </div>
                <p className="text-slate-800 text-base leading-relaxed font-medium">{finalTranscript}</p>
              </div>
            </div>
          )}

          {/* Swipeable slider - 3 panels side by side */}
          <div className="overflow-hidden flex-1" style={{minHeight: 0}}>
          <div
            ref={sliderRef}
            className="flex h-full"
            style={{
              transform: `translateX(-${modeIndex * 100}%)`,
              transition: 'transform 200ms ease-out',
              willChange: 'transform',
            }}
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
              touchStartY.current = e.touches[0].clientY;
              isSwiping.current = false;
            }}
            onTouchMove={(e) => {
              const dx = e.touches[0].clientX - touchStartX.current;
              const dy = e.touches[0].clientY - touchStartY.current;
              if (!isSwiping.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
                isSwiping.current = true;
              }
              if (isSwiping.current) e.preventDefault();
            }}
            onTouchEnd={(e) => {
              if (!isSwiping.current) return;
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              const threshold = 50;
              const modes: Array<'MANUAL' | 'PENDING' | 'OCR'> = ['MANUAL', 'PENDING', 'OCR'];
              if (dx < -threshold && modeIndex < 2) {
                setMode(modes[modeIndex + 1]);
                setSelectedCategory(null);
              } else if (dx > threshold && modeIndex > 0) {
                setMode(modes[modeIndex - 1]);
                setSelectedCategory(null);
              }
              isSwiping.current = false;
            }}
          >
            {/* Slide 0 - Manual Search */}
            <div ref={slide0Ref} className="w-full shrink-0 overflow-y-auto flex flex-col">

              {/* ── Category full-page view ── */}
              {selectedCategory ? (
                <div className="flex flex-col flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                    </button>
                    <h2 className="font-bold text-slate-900 text-base">{selectedCategory}</h2>
                    <span className="ml-auto text-xs text-slate-400">
                      {catalog.filter(p => (p.category || 'Uncategorized') === selectedCategory).length} items
                    </span>
                  </div>
                  {/* Products grid */}
                  <div className="grid grid-cols-3 gap-3 p-4">
                    {catalog.filter(p => (p.category || 'Uncategorized') === selectedCategory).map((p: any) => {
                      const cartItem = cart.find(c => c.productId === p.id && c.unit === p.baseUnit);
                      const qty = cartItem ? cartItem.quantity : 0;
                      return (
                        <div key={p.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                          <div className="relative w-full bg-slate-50" style={{paddingBottom:'100%'}}>
                            <div className="absolute inset-0 flex items-center justify-center p-2">
                              {p.imageUrl
                                ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display='none'; }} />
                                : <Package className="text-slate-300" size={28} />
                              }
                            </div>
                          </div>
                          <div className="p-2">
                            <p className="font-semibold text-slate-900 text-xs line-clamp-2 leading-tight mb-1">{p.name}</p>
                            <p className="text-[10px] text-slate-400 mb-1.5">{p.baseQuantity === 1 ? '' : p.baseQuantity}{p.baseUnit}</p>
                            <p className="text-sm font-bold text-slate-900 mb-2">₹{(p.price || 0).toFixed(0)}</p>
                            {qty > 0 ? (
                              <div className="flex items-center justify-between bg-indigo-600 rounded-lg px-1 py-1">
                                <button onClick={() => { const i = cart.indexOf(cartItem); qty <= 1 ? removeFromCart(i) : updateCartItem(i, 'quantity', qty - 1); }} className="w-6 h-6 flex items-center justify-center text-white font-bold text-base">−</button>
                                <span className="text-white text-xs font-bold">{qty}</span>
                                <button onClick={() => updateCartItem(cart.indexOf(cartItem), 'quantity', qty + 1)} className="w-6 h-6 flex items-center justify-center text-white font-bold text-base">+</button>
                              </div>
                            ) : (
                              <button onClick={() => addToCart(p)} className="w-full border-2 border-indigo-600 text-indigo-600 rounded-lg py-1 text-xs font-bold hover:bg-indigo-50 transition flex items-center justify-center gap-1">
                                <Plus size={12} /> Add
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              ) : (
                /* ── Home view ── */
                <div className="flex flex-col gap-0">

                  {/* Search bar */}
                  <div className="px-4 pt-4 pb-3 sticky top-0 bg-white z-10 border-b border-slate-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Search products…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition"
                      />
                      {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── SEARCH RESULTS ── */}
                  {search.length > 1 ? (
                    <div className="px-4 pt-3">
                      {searchResults.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                          <Package size={36} className="mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No products found</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          {searchResults.map((p: any) => {
                            const cartItem = cart.find(c => c.productId === p.id && c.unit === p.baseUnit);
                            const qty = cartItem ? cartItem.quantity : 0;
                            return (
                              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                <div className="relative w-full bg-slate-50" style={{paddingBottom:'100%'}}>
                                  <div className="absolute inset-0 flex items-center justify-center p-2">
                                    {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display='none'; }} /> : <Package className="text-slate-300" size={28} />}
                                  </div>
                                </div>
                                <div className="p-2">
                                  <p className="font-semibold text-slate-900 text-xs line-clamp-2 leading-tight mb-1">{p.name}</p>
                                  <p className="text-[10px] text-slate-400 mb-1.5">{p.baseQuantity === 1 ? '' : p.baseQuantity}{p.baseUnit}</p>
                                  <p className="text-sm font-bold text-slate-900 mb-2">₹{(p.price || 0).toFixed(0)}</p>
                                  {qty > 0 ? (
                                    <div className="flex items-center justify-between bg-indigo-600 rounded-lg px-1 py-1">
                                      <button onClick={() => { const i = cart.indexOf(cartItem); qty <= 1 ? removeFromCart(i) : updateCartItem(i, 'quantity', qty - 1); }} className="w-6 h-6 flex items-center justify-center text-white font-bold text-base">−</button>
                                      <span className="text-white text-xs font-bold">{qty}</span>
                                      <button onClick={() => updateCartItem(cart.indexOf(cartItem), 'quantity', qty + 1)} className="w-6 h-6 flex items-center justify-center text-white font-bold text-base">+</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => addToCart(p)} className="w-full border-2 border-indigo-600 text-indigo-600 rounded-lg py-1 text-xs font-bold hover:bg-indigo-50 transition flex items-center justify-center gap-1">
                                      <Plus size={12} /> Add
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  ) : (
                    /* ── HOME: Top selling + Categories ── */
                    <>
                      {/* Top Selling — horizontal scroll */}
                      {catalog.length > 0 && (
                        <div className="pt-4 pb-2">
                          <div className="flex items-center justify-between px-4 mb-3">
                            <h2 className="text-sm font-bold text-slate-900">⚡ Top Selling</h2>
                          </div>
                          <div
                            className="flex gap-3 overflow-x-auto px-4 pb-2"
                            style={{scrollbarWidth:'none'}}
                            onTouchStart={e => e.stopPropagation()}
                            onTouchMove={e => e.stopPropagation()}
                            onTouchEnd={e => e.stopPropagation()}
                          >
                            {catalog.slice(0, 10).map((p: any) => {
                              const cartItem = cart.find(c => c.productId === p.id && c.unit === p.baseUnit);
                              const qty = cartItem ? cartItem.quantity : 0;
                              return (
                                <div key={p.id} className="flex-shrink-0 w-28 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                  <div className="relative w-full bg-slate-50" style={{paddingBottom:'100%'}}>
                                    <div className="absolute inset-0 flex items-center justify-center p-2">
                                      {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display='none'; }} /> : <Package className="text-slate-300" size={24} />}
                                    </div>
                                  </div>
                                  <div className="p-2">
                                    <p className="font-semibold text-slate-900 text-[11px] line-clamp-2 leading-tight mb-1">{p.name}</p>
                                    <p className="text-[10px] text-slate-400 mb-1">{p.baseQuantity === 1 ? '' : p.baseQuantity}{p.baseUnit}</p>
                                    <p className="text-xs font-bold text-slate-900 mb-1.5">₹{(p.price || 0).toFixed(0)}</p>
                                    {qty > 0 ? (
                                      <div className="flex items-center justify-between bg-indigo-600 rounded-lg px-1 py-0.5">
                                        <button onClick={() => { const i = cart.indexOf(cartItem); qty <= 1 ? removeFromCart(i) : updateCartItem(i, 'quantity', qty - 1); }} className="w-5 h-5 flex items-center justify-center text-white font-bold text-sm">−</button>
                                        <span className="text-white text-[11px] font-bold">{qty}</span>
                                        <button onClick={() => updateCartItem(cart.indexOf(cartItem), 'quantity', qty + 1)} className="w-5 h-5 flex items-center justify-center text-white font-bold text-sm">+</button>
                                      </div>
                                    ) : (
                                      <button onClick={() => addToCart(p)} className="w-full border-2 border-indigo-600 text-indigo-600 rounded-lg py-0.5 text-[11px] font-bold hover:bg-indigo-50 transition flex items-center justify-center gap-0.5">
                                        <Plus size={11} /> Add
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Divider */}
                      <div className="h-2 bg-slate-100 my-1" />

                      {/* Categories grid */}
                      <div className="px-4 pt-4 pb-6">
                        <h2 className="text-sm font-bold text-slate-900 mb-3">🛒 Shop by Category</h2>
                        {(() => {
                          const cats = Array.from(new Set(catalog.map(p => p.category || 'Uncategorized'))).sort();
                          // Pick a representative image per category
                          const catData = cats.map(cat => {
                            const products = catalog.filter(p => (p.category || 'Uncategorized') === cat);
                            const imgProduct = products.find(p => p.imageUrl);
                            return { cat, count: products.length, img: imgProduct?.imageUrl || null };
                          });
                          return (
                            <div className="grid grid-cols-3 gap-3">
                              {catData.map(({ cat, count, img }) => (
                                <button
                                  key={cat}
                                  onClick={() => setSelectedCategory(cat)}
                                  className="flex flex-col items-center bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 active:scale-95 transition-all"
                                >
                                  <div className="w-full bg-gradient-to-br from-indigo-50 to-slate-100 flex items-center justify-center" style={{paddingBottom:'75%', position:'relative'}}>
                                    <div className="absolute inset-0 flex items-center justify-center p-3">
                                      {img
                                        ? <img src={img} alt={cat} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display='none'; }} />
                                        : <Package className="text-indigo-300" size={28} />
                                      }
                                    </div>
                                  </div>
                                  <div className="p-2 text-center w-full">
                                    <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight">{cat}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{count} items</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Slide 1 - Pending Bills */}
            <div ref={slide1Ref} className="w-full shrink-0 p-6 space-y-8 overflow-y-auto">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"></span><h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Pending</h3></div>
                  {pendingBills.length > 0 && <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{pendingBills.length}</span>}
                </div>
                {loadingBills ? (
                  <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}</div>
                ) : pendingBills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2 border border-dashed border-slate-200 rounded-xl"><ShoppingCart size={28} className="opacity-30" /><p className="text-sm">No pending orders</p></div>
                ) : (
                  <div className="space-y-2">
                    {(showMorePending ? allPendingBills : pendingBills).map((bill) => (
                      <div key={bill.id} onClick={() => setSelectedBill(bill)} className="group relative flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-orange-300 hover:shadow-md hover:shadow-orange-50 transition-all">
                        <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0"><span className="text-orange-500 text-lg">🕐</span></div>
                        <div className="flex-1 min-w-0"><p className="font-semibold text-slate-900 text-sm truncate">{getBillLabel(bill)}</p><p className="text-xs text-slate-400 mt-0.5">{bill.items?.length || 0} items · {new Date(bill.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p></div>
                        <div className="text-right shrink-0"><p className="font-bold text-slate-900 text-sm">₹{bill.totalAmount?.toFixed(0) || '0'}</p><span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md">Pending</span></div>
                        <div className="absolute inset-y-0 left-0 w-1 bg-orange-400 rounded-full" />
                      </div>
                    ))}
                    {!showMorePending && allPendingBills.length > 5 && <button onClick={() => setShowMorePending(true)} className="w-full mt-1 py-2.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl text-xs font-semibold transition border border-dashed border-slate-200 hover:border-orange-200">Show {allPendingBills.length - 5} more</button>}
                    {showMorePending && allPendingBills.length > 5 && <button onClick={() => setShowMorePending(false)} className="w-full mt-1 py-2.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl text-xs font-semibold transition border border-dashed border-slate-200 hover:border-orange-200">Show less</button>}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-400"></span><h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Completed</h3></div>
                  {allCompletedBills.length > 0 && <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{allCompletedBills.length}</span>}
                </div>
                {completedBills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2 border border-dashed border-slate-200 rounded-xl"><p className="text-sm">No completed orders yet</p></div>
                ) : (
                  <div className="space-y-2">
                    {(showMoreCompleted ? allCompletedBills : completedBills).map((bill) => (
                      <div key={bill.id} onClick={() => setSelectedBill(bill)} className="group relative flex items-center gap-4 p-3.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-50 transition-all">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0"><CheckCircle size={16} className="text-emerald-500" /></div>
                        <div className="flex-1 min-w-0"><p className="font-medium text-slate-800 text-sm truncate">{getBillLabel(bill)}</p><p className="text-xs text-slate-400 mt-0.5">{new Date(bill.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p></div>
                        <p className="font-semibold text-slate-700 text-sm shrink-0">₹{bill.totalAmount?.toFixed(0) || '0'}</p>
                        <div className="absolute inset-y-0 left-0 w-0.5 bg-emerald-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                    {!showMoreCompleted && allCompletedBills.length > 3 && <button onClick={() => setShowMoreCompleted(true)} className="w-full mt-1 py-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl text-xs font-semibold transition border border-dashed border-slate-200 hover:border-indigo-200">Show {allCompletedBills.length - 3} more</button>}
                    {showMoreCompleted && allCompletedBills.length > 3 && <button onClick={() => setShowMoreCompleted(false)} className="w-full mt-1 py-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl text-xs font-semibold transition border border-dashed border-slate-200 hover:border-indigo-200">Show less</button>}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.6)]"></span><h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Unpaid</h3></div>
                  {allUnpaidBills.length > 0 && <span className="text-xs font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{allUnpaidBills.length}</span>}
                </div>
                {unpaidBills.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2 border border-dashed border-slate-200 rounded-xl"><p className="text-sm">No unpaid bills</p></div>
                ) : (
                  <div className="space-y-2">
                    {(showMoreUnpaid ? allUnpaidBills : unpaidBills).map((bill) => (
                      <div key={bill.id} onClick={() => setSelectedBill(bill)} className="group relative flex items-center gap-4 p-3.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-rose-300 hover:shadow-md hover:shadow-rose-50 transition-all">
                        <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0"><TriangleAlert size={15} className="text-rose-500" /></div>
                        <div className="flex-1 min-w-0"><p className="font-medium text-slate-800 text-sm truncate">{getBillLabel(bill)}</p><p className="text-xs text-slate-400 mt-0.5">{new Date(bill.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p></div>
                        <p className="font-semibold text-rose-600 text-sm shrink-0">₹{bill.totalAmount?.toFixed(0) || '0'}</p>
                        <div className="absolute inset-y-0 left-0 w-0.5 bg-rose-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                    {!showMoreUnpaid && allUnpaidBills.length > 3 && <button onClick={() => setShowMoreUnpaid(true)} className="w-full mt-1 py-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl text-xs font-semibold transition border border-dashed border-slate-200 hover:border-indigo-200">Show {allUnpaidBills.length - 3} more</button>}
                    {showMoreUnpaid && allUnpaidBills.length > 3 && <button onClick={() => setShowMoreUnpaid(false)} className="w-full mt-1 py-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl text-xs font-semibold transition border border-dashed border-slate-200 hover:border-indigo-200">Show less</button>}
                  </div>
                )}
              </div>
            </div>

            {/* Slide 2 - Scan Slip / Review */}
            <div ref={slide2Ref} className="w-full shrink-0 flex flex-col overflow-y-auto" style={{minHeight: 0}}>
              {!isReviewing ? (
                /* ── IDLE STATE: Upload / Voice prompt ── */
                <div className="flex flex-col gap-4 p-5">
                  {/* Voice hint banner */}
                  {isListening ? (
                    <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50">
                      <div className="h-1 w-full bg-gradient-to-r from-rose-400 via-orange-400 to-rose-400 animate-pulse" />
                      <div className="p-4 flex items-start gap-3">
                        <span className="relative flex h-3 w-3 mt-0.5 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-1">Listening…</p>
                          <p className="text-slate-700 text-sm leading-relaxed break-words">{finalTranscript || 'Say items like "2 kg sugar, 1 packet salt…"'}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 flex items-center gap-3">
                      <span className="text-2xl">🎤</span>
                      <div>
                        <p className="text-sm font-semibold text-indigo-700">Speak your order</p>
                        <p className="text-xs text-indigo-500 mt-0.5">Tap "Start Speaking" below and say items</p>
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-400 font-medium">or upload a slip</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  {/* Upload area */}
                  <div
                    className="border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/40 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 active:bg-indigo-100 transition-colors"
                    style={{minHeight: '120px'}}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
                    {previewUrl
                      ? <img src={previewUrl} alt="Preview" className="max-h-48 rounded-xl shadow-sm object-contain" />
                      : (
                        <div className="flex flex-col items-center gap-2 py-6 text-indigo-500">
                          <Camera size={36} />
                          <span className="font-semibold text-sm">Tap to capture or upload</span>
                          <span className="text-xs text-indigo-400">Photo of handwritten / printed list</span>
                        </div>
                      )
                    }
                  </div>

                  {file && (
                    <button
                      disabled={isProcessing}
                      onClick={processImage}
                      className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                    >
                      {isProcessing ? (
                        <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Analyzing…</>
                      ) : (
                        <><Camera size={16} />Analyze Image</>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                /* ── REVIEW STATE: Detected items list ── */
                <div className="flex flex-col" style={{height: '100%'}}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle size={14} className="text-emerald-600" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-none">Detected Items</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{reviewItems.length} item{reviewItems.length !== 1 ? 's' : ''} found</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isListening && (
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                          </span>
                          Live
                        </span>
                      )}
                      <button
                        onClick={() => { setIsReviewing(false); setReviewItems([]); globalTranscriptRef.current = ""; currentBreathRef.current = ""; setFinalTranscript(""); }}
                        className="text-xs text-slate-400 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition font-medium"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Live transcript strip */}
                  {isListening && finalTranscript && (
                    <div className="mx-4 mt-3 px-3 py-2 bg-rose-50 border border-rose-100 rounded-xl flex-shrink-0">
                      <p className="text-xs text-rose-600 leading-relaxed line-clamp-2">{finalTranscript}</p>
                    </div>
                  )}

                  {/* Items list */}
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" style={{minHeight: 0}}>
                    {reviewItems.map((item, idx) => (
                      <div
                        key={idx}
                        className={`relative rounded-2xl border overflow-hidden transition-all ${
                          item.isRepeated
                            ? 'border-amber-300 bg-amber-50/30'
                            : item.productId
                            ? 'border-slate-200 bg-white'
                            : 'border-rose-200 bg-rose-50/20'
                        }`}
                      >
                        {/* Top color bar */}
                        <div className={`h-0.5 w-full ${item.isRepeated ? 'bg-amber-400' : item.productId ? 'bg-emerald-400' : 'bg-rose-400'}`} />

                        <div className="p-3">
                          {item.isRepeated && (
                            <span className="absolute top-2.5 right-2.5 bg-amber-400 text-white text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full">Dup</span>
                          )}

                          {/* Row 1: image + name + delete */}
                          <div className="flex gap-2.5 items-center">
                            <div className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center border ${item.productId ? 'border-slate-100 bg-slate-50' : 'border-rose-100 bg-rose-50'}`}>
                              {item.imageUrl
                                ? <img src={item.imageUrl} className="w-full h-full object-cover" />
                                : <Package className={item.productId ? 'text-slate-300' : 'text-rose-300'} size={18} />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <input
                                value={item.name}
                                onChange={e => { const n = [...reviewItems]; n[idx].name = e.target.value; setReviewItems(n); }}
                                className="font-semibold text-slate-900 w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none text-sm pb-0.5 transition-colors"
                                placeholder="Product Name"
                              />
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.productId ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                <span className={`text-[10px] font-medium truncate ${item.productId ? 'text-emerald-600' : 'text-rose-500'}`}>
                                  {item.productId ? (item.aiLabel || 'Matched') : 'Not found in catalog'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const newItems = reviewItems.filter((_, i) => i !== idx);
                                baseReviewItemsRef.current = newItems;
                                globalTranscriptRef.current = "";
                                currentBreathRef.current = "";
                                setFinalTranscript("");
                                if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch(e) {} }
                                setReviewItems(newItems);
                              }}
                              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors shrink-0"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {/* Row 2: qty + price */}
                          <div className="flex gap-2 mt-2.5 items-center">
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden h-8 shrink-0">
                              <button onClick={() => { const n = [...reviewItems]; n[idx].quantity = Math.max(1, n[idx].quantity - 1); setReviewItems(n); }} className="w-7 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition font-bold text-sm">−</button>
                              <input type="number" className="w-10 text-center text-xs font-bold focus:outline-none bg-transparent text-slate-800" value={item.quantity} onChange={e => { const n = [...reviewItems]; n[idx].quantity = parseFloat(e.target.value) || 1; setReviewItems(n); }} />
                              <span className="text-[10px] text-slate-400 font-semibold pr-1.5">{item.unit || item.baseUnit}</span>
                              <button onClick={() => { const n = [...reviewItems]; n[idx].quantity += 1; setReviewItems(n); }} className="w-7 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition font-bold text-sm">+</button>
                            </div>
                            <div className="flex items-center gap-1 flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 h-8">
                              <span className="text-slate-400 text-xs font-medium">₹</span>
                              <input type="number" className="flex-1 bg-transparent focus:outline-none text-xs font-bold text-slate-800 min-w-0" value={item.price || item.sellingPrice || 0} onChange={e => { const n = [...reviewItems]; n[idx].price = parseFloat(e.target.value) || 0; setReviewItems(n); }} />
                            </div>
                            <span className="text-xs font-bold text-indigo-600 shrink-0">
                              ₹{((item.price || 0) * item.quantity).toFixed(0)}
                            </span>
                          </div>

                          {/* Suggestions */}
                          {item.suggestions && item.suggestions.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-slate-100">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Similar products</p>
                              <div className="flex gap-2 overflow-x-auto pb-1" style={{scrollbarWidth:'none'}}>
                                {item.suggestions.map((sug: any, sIdx: number) => (
                                  <button
                                    key={sIdx}
                                    onClick={() => {
                                      const overrides = { productId: sug.id, name: sug.name, localName: sug.localName, price: sug.price, baseUnit: sug.baseUnit, baseQuantity: sug.baseQuantity, packetWeight: sug.packetWeight, packetUnit: sug.packetUnit, imageUrl: sug.imageUrl };
                                      if (item.aiLabel) { itemOverridesRef.current[item.aiLabel] = overrides; }
                                      const newItems = [...reviewItems]; newItems[idx] = { ...newItems[idx], ...overrides }; setReviewItems(newItems);
                                    }}
                                    className="flex-shrink-0 flex flex-col items-center bg-white border border-slate-200 hover:border-indigo-300 rounded-xl overflow-hidden w-16 transition-all"
                                  >
                                    <div className="w-full h-12 bg-slate-50 overflow-hidden flex items-center justify-center">
                                      {sug.imageUrl ? <img src={sug.imageUrl} className="w-full h-full object-cover" /> : <Package className="text-slate-300" size={16} />}
                                    </div>
                                    <div className="p-1 text-center">
                                      <p className="text-[9px] font-bold text-slate-700 line-clamp-2 leading-tight">{sug.name}</p>
                                      <p className="text-[9px] font-bold text-emerald-600">₹{(sug.price || 0).toFixed(0)}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={reviewEndRef} />
                  </div>

                  {/* Add to Bill button */}
                  <div className="px-4 pb-4 pt-2 flex-shrink-0 border-t border-slate-100 bg-white">
                    <button
                      onClick={confirmReview}
                      className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-3.5 rounded-2xl hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98] transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 text-sm"
                    >
                      <CheckCircle size={18} />
                      Add {reviewItems.length} item{reviewItems.length !== 1 ? 's' : ''} to Bill
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Floating Voice Button - fixed bottom center, visible on all tabs */}
      <button
        onClick={isListening ? stopVoiceInput : startVoiceInput}
        className={`fixed left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-6 py-3.5 rounded-full font-bold text-white shadow-2xl transition-all duration-500 ${
          isListening
            ? 'bg-rose-500 shadow-rose-400/50 scale-105 animate-pulse pr-5'
            : 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-emerald-500/40 hover:scale-105 hover:shadow-emerald-500/60'
        }`}
        style={{
          minWidth: '180px',
          justifyContent: 'center',
          bottom: cart.length > 0 ? 'calc(100vh - 7rem)' : '1.5rem',
        }}
      >
        {isListening ? (
          <>
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            Stop Listening
          </>
        ) : (
          <>
            <span className="text-lg leading-none">🎤</span>
            Start Speaking
          </>
        )}
      </button>

      {/* Cart Bottom Sheet — shown after "Add items to Bill" on mobile */}
      {/* Cart Bottom Sheet — mini bar when collapsed, full sheet when expanded */}
      {(showCartSheet || cart.length > 0) && (
        <CartBottomSheet
          cart={cart}
          totalAmount={totalAmount}
          customerInfo={customerInfo}
          setCustomerInfo={setCustomerInfo}
          savingBill={savingBill}
          calculateItemTotal={calculateItemTotal}
          updateCartItem={updateCartItem}
          removeFromCart={removeFromCart}
          handleGenerateBill={handleGenerateBill}
          expanded={showCartSheet}
          onExpand={() => setShowCartSheet(true)}
          onCollapse={() => setShowCartSheet(false)}
          onClearCart={() => { setCart([]); setCustomerInfo({ name: '', phone: '', paymentMethod: 'CASH', status: 'PAID' }); setShowCartSheet(false); }}
        />
      )}

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
                  <p className="font-medium text-slate-900 mt-1">{getBillNumber(selectedBill)}</p>
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

function CartBottomSheet({ cart, totalAmount, customerInfo, setCustomerInfo, savingBill, calculateItemTotal, updateCartItem, removeFromCart, handleGenerateBill, expanded, onExpand, onCollapse, onClearCart }: any) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragCurrentY = useRef(0);
  const isDragging = useRef(false);

  // Full sheet height (85vh) vs mini bar height (~64px)
  const MINI_HEIGHT = 64;
  const FULL_HEIGHT_VH = 88;

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = 0;
    isDragging.current = true;
    if (sheetRef.current) sheetRef.current.style.transition = 'none';
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    if (expanded && dy < 0) return;   // can't drag up when already expanded
    if (!expanded && dy > 0) return;  // can't drag down when already mini
    dragCurrentY.current = dy;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (sheetRef.current) sheetRef.current.style.transition = 'transform 220ms ease-out';
    const dy = dragCurrentY.current;
    if (expanded && dy > 100) {
      // Collapse to mini
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
      onCollapse();
    } else if (!expanded && dy < -60) {
      // Expand to full
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
      onExpand();
    } else {
      // Snap back
      if (sheetRef.current) sheetRef.current.style.transform = 'translateY(0)';
    }
    dragCurrentY.current = 0;
  };

  return (
    <>
      {/* Backdrop — only when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onCollapse}
        />
      )}

      {/* The sheet itself — always mounted, switches between mini and full */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white shadow-2xl"
        style={{
          borderRadius: expanded ? '24px 24px 0 0' : '20px 20px 0 0',
          maxHeight: expanded ? `${FULL_HEIGHT_VH}vh` : `${MINI_HEIGHT}px`,
          height: expanded ? `${FULL_HEIGHT_VH}vh` : `${MINI_HEIGHT}px`,
          transition: 'max-height 220ms ease-out, height 220ms ease-out, border-radius 220ms ease-out',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── MINI BAR (collapsed) ── */}
        {!expanded && (
          <div
            className="flex items-center gap-3 px-4 h-full cursor-pointer active:bg-slate-50 transition"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={onExpand}
          >
            {/* Drag pill */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-slate-300" />
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              <ShoppingCart size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm">{cart.length} item{cart.length !== 1 ? 's' : ''} in bill</p>
              <p className="text-xs text-slate-500">Tap or swipe up to view</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-emerald-600 text-base">₹{totalAmount.toFixed(0)}</p>
            </div>
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
            </div>
          </div>
        )}

        {/* ── FULL SHEET (expanded) ── */}
        {expanded && (
          <>
            {/* Drag handle + down arrow button */}
            <div
              className="flex flex-col items-center pt-3 pb-2 flex-shrink-0 cursor-grab gap-1.5"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="w-10 h-1.5 rounded-full bg-slate-300" />
              <button
                onClick={onCollapse}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 transition"
                title="Collapse"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </button>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart size={18} className="text-indigo-500" /> Current Bill
                <span className="bg-indigo-100 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">{cart.length}</span>
              </h2>
              <button
                onClick={onClearCart}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition"
                title="Clear bill"
              >
                <X size={16} />
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                  <ShoppingCart size={40} className="opacity-20" />
                  <p className="text-sm">Cart is empty</p>
                </div>
              ) : (
                cart.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-3 items-center bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="w-10 h-10 rounded-lg bg-white overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
                      {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <Package className="text-slate-400" size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">₹{(item.price || 0).toFixed(2)} / {item.baseUnit}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg h-7 shrink-0">
                      <button onClick={() => { const q = item.quantity - 1; q <= 0 ? removeFromCart(idx) : updateCartItem(idx, 'quantity', q); }} className="w-6 h-full flex items-center justify-center text-slate-500 text-sm font-bold">−</button>
                      <span className="text-xs font-bold text-slate-800 px-1">{item.quantity}</span>
                      <button onClick={() => updateCartItem(idx, 'quantity', item.quantity + 1)} className="w-6 h-full flex items-center justify-center text-slate-500 text-sm font-bold">+</button>
                    </div>
                    <p className="text-sm font-bold text-indigo-600 shrink-0 w-14 text-right">₹{calculateItemTotal(item).toFixed(0)}</p>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="px-4 pb-6 pt-3 border-t border-slate-100 space-y-3 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">Total</span>
                  <span className="text-xl font-bold text-emerald-600">₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    placeholder="📱 Phone Number"
                    value={customerInfo.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const newInfo = { ...customerInfo, phone: val };
                      setCustomerInfo(newInfo);
                      if (val.length === 10) { handleGenerateBill(newInfo); onCollapse(); }
                    }}
                    className="w-full bg-white border-2 border-indigo-200 rounded-xl px-4 py-3 text-base font-semibold focus:outline-none focus:border-indigo-500 placeholder:text-slate-400 placeholder:font-normal tracking-wider"
                  />
                  <input
                    type="text"
                    placeholder="Customer Name (optional)"
                    value={customerInfo.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCustomerInfo({ ...customerInfo, status: 'PAID' })} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${customerInfo.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>✓ Paid</button>
                  <button onClick={() => setCustomerInfo({ ...customerInfo, status: 'UNPAID' })} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${customerInfo.status === 'UNPAID' ? 'bg-rose-100 text-rose-700 border border-rose-300' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>Unpaid</button>
                </div>
                <button
                  disabled={savingBill}
                  onClick={() => { handleGenerateBill(); onCollapse(); }}
                  className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl hover:bg-indigo-500 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  <CheckCircle size={18} />
                  {savingBill ? 'Saving…' : 'Generate Bill'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
