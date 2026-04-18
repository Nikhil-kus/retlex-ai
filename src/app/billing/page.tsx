'use client';
import Fuse from 'fuse.js';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Camera, FileText, Upload, Plus, Minus, Trash, CheckCircle, TriangleAlert, ShoppingCart, X } from 'lucide-react';

export default function BillingPage() {
  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const processedChunksRef = useRef(new Set());  const parseVoiceItems = (text: string) => {
    text = text.toLowerCase().trim();
    const words = text.split(/\s+/);
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
            commitItem();
            pendingQty = parsedNum;
            pendingUnit = finalUnit;
            hasLeadingNumber = true;
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

  const handleVoiceText = (text: string) => {
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

    // PHASE 3: CONNECT WITH EXISTING CATALOG (STRICT MODE)
    const fuse = new Fuse(catalog, {
      keys: ['name', 'localName'],
      threshold: 0.35,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2
    });

    const seenItemsMap = new Set();

    const matchedItems = normalizedItems.map(item => {
      const searchName = item.name.replace(/\d+/g, '').replace(/\b(kg|g|ml|l|ltr|pcs?|pieces?|pkt|pack|packet|day|meter|m)\b/gi, '').trim();
      const result = fuse.search(searchName);
      let bestMatch: any = null;

      // Strict direct hit check ONLY
      if (result.length && (result[0].score ?? 1) <= 0.4) {
        bestMatch = result[0].item;
      }

      // DO NOT GUESS fallback logic removed as requested.

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
      const baseUnit = match.baseUnit || 'pc';

      if (item.unit === 'g' && baseUnit === 'kg') {
        finalQty = finalQty / 1000;
      } else if (item.unit === 'g' && baseUnit === 'g') {
        finalQty = finalQty / (match.baseQuantity || 1);
      } else if (item.unit === 'ml' && baseUnit === 'l') {
        finalQty = finalQty / 1000;
      } else if (item.unit === 'ml' && baseUnit === 'ml') {
        finalQty = finalQty / (match.baseQuantity || 1);
      }

      return {
        productId: match.id,
        name: match.name, // Safely mapped exactly from Database Output
        quantity: finalQty,
        unit: baseUnit,
        baseUnit: match.baseUnit,
        baseQuantity: match.baseQuantity,
        price: match.price,
        costPrice: match.costPrice,
        confidence: 'high',
        hasExplicitQty: true,
        aiLabel: match.name,
        isRepeated
      };
    });

    setReviewItems(prev => {
      // Accumulate new voice chunks without destroying previous ones in the review screen
      return [...prev, ...matchedItems];
    });
    setIsReviewing(true);

    console.log("Phase 3: Sent to Review UI:", matchedItems);
  };
  const startVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported");
      return;
    }

    transcriptRef.current = "";
    setFinalTranscript("");

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interimStr = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const chunk = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          const cleanChunk = chunk.trim().toLowerCase();
          if (!processedChunksRef.current.has(cleanChunk)) {
            processedChunksRef.current.add(cleanChunk);
            transcriptRef.current += chunk + " ";
            
            // PROCESS FINISHED CHUNK INSTANTLY!
            if (cleanChunk) {
               handleVoiceText(cleanChunk);
            }
          }
        } else {
          interimStr += chunk;
        }
      }
      
      setFinalTranscript(transcriptRef.current + interimStr);
    };


    recognition.onerror = (e: any) => {
       console.error("Speech Error:", e);
       // Auto-stop if it fails out natively but attempt to process whatever was captured
       if (isListening) stopVoiceInput();
    };

    recognition.start();
    setIsListening(true);
    recognitionRef.current = recognition;
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }
    setIsListening(false);

    // We do NOT process on stop anymore to avoid duplicating what was done live.
    // However, if the user cut off mid-sentence and there's trailing interim text,
    // we can attempt to process it cleanly if it wasn't flagged as final yet!
    
    let leftover = finalTranscript.trim().replace(transcriptRef.current.trim(), "").trim();
    if (leftover && leftover.length > 2) {
       handleVoiceText(leftover);
    }
    
    // Clear out for next usage safely
    transcriptRef.current = "";
    setFinalTranscript("");
  };

  const router = useRouter();
  const [shop, setShop] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [mode, setMode] = useState<'MANUAL' | 'OCR' | 'AI'>('MANUAL');

  // Cart state
  const [cart, setCart] = useState<any[]>([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', paymentMethod: 'CASH', status: 'PAID' });
  const [savingBill, setSavingBill] = useState(false);

  // Manual Mode state
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // AI/OCR state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewItems, setReviewItems] = useState<any[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/shop').then(r => r.json()).then(data => {
      setShop(data);
      if (data?.id) fetchCatalog(data.id);
    });
  }, []);

  const fetchCatalog = async (shopId: string) => {
    const res = await fetch(`/api/products?shopId=${shopId}`);
    if (res.ok) setCatalog(await res.json());
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
        price: product.price || 0,
        costPrice: product.costPrice || 0,
        unit: product.baseUnit || 'pc',
        baseUnit: product.baseUnit || 'pc',
        baseQuantity: product.baseQuantity || 1,
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

    if (baseUnit === 'pc' || scannedUnit === 'pc') return item.quantity * price;

    let qBase = item.quantity;
    if (scannedUnit === 'kg' || scannedUnit === 'ltr') qBase *= 1000;

    let bBase = baseQuantity;
    if (baseUnit === 'kg' || baseUnit === 'ltr') bBase *= 1000;

    return (qBase / bBase) * price;
  };

  const totalAmount = cart.reduce((acc, item) => acc + calculateItemTotal(item), 0);

  const handleGenerateBill = async () => {
    if (cart.length === 0) return alert('Cart is empty!');
    setSavingBill(true);

    const payload = {
      shopId: shop.id,
      items: cart,
      ...customerInfo,
    };

    const res = await fetch('/api/bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const bill = await res.json();
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
      if (!res.ok) {
        setReviewItems([{ name: `Engine Error: Server failed`, quantity: 0, unit: '', price: 0, productId: null, isRepeated: false }]);
        setIsReviewing(true);
        setIsProcessing(false);
        return;
      }
      
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      // Clear the slate and open the container immediately so it builds live visually
      setReviewItems([]);
      setIsReviewing(true);

      let buffer = "";
      const seenFrontendItems = new Set(); // DEDUPLICATION (VERY IMPORTANT)

      while (true) {
        let readResult;
        let frontendTimer: any;
        try {
            // TIMEOUT PROTECTION
            const timeoutPromise = new Promise((_, reject) => {
                frontendTimer = setTimeout(() => reject(new Error("Stream timeout")), 90000);
            });
            readResult = await Promise.race([ reader.read(), timeoutPromise ]);
            clearTimeout(frontendTimer);
        } catch (timeoutError) {
            if (frontendTimer) clearTimeout(frontendTimer);
            console.warn("Stream read timed out gracefully.");
            break;
        }

        const { done, value } = readResult as any;
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Safely parse chunks using newline delimiters since edge streams might merge multiple strings in one buffer payload
        let boundary = buffer.indexOf('\n');
        while (boundary !== -1) {
           const chunkStr = buffer.slice(0, boundary).trim();
           buffer = buffer.slice(boundary + 1);

           if (chunkStr) {
               // 1. SAFE JSON PARSING & 6. FRONTEND SAFETY
              try {
                  const parsed = JSON.parse(chunkStr);
                  if (parsed.item) {
                     const itemKey = `${parsed.item.productId || parsed.item.name}_${parsed.item.quantity}`.toLowerCase();
                     // 3. DEDUPLICATION (frontend validation)
                     if (!seenFrontendItems.has(itemKey)) {
                         seenFrontendItems.add(itemKey);
                         // Append item live row by row (7. ERROR RESILIENCE - state is preserved)
                         setReviewItems(prev => [...prev, parsed.item]);
                     }
                  }
              } catch(e) {
                  // If JSON is incomplete -> DO NOT crash. Skip chunk.
                  console.warn("Skipping unparseable chunk fragment");
              }
           }
           boundary = buffer.indexOf('\n');
        }
      }

      // 4. FALLBACK HANDLING
      if (buffer.trim().startsWith('{') && buffer.trim().endsWith('}')) {
          try {
              const fallbackParsed = JSON.parse(buffer.trim());
              if (fallbackParsed.item) {
                  const itemKey = `${fallbackParsed.item.productId || fallbackParsed.item.name}_${fallbackParsed.item.quantity}`.toLowerCase();
                  if (!seenFrontendItems.has(itemKey)) setReviewItems(prev => [...prev, fallbackParsed.item]);
              }
          } catch (e) {
              // Discard safely
          }
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
  };

  if (!shop) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 h-full">

      {/* Left Panel: Modes & Input */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex border-b border-slate-100">
            <TabButton active={mode === 'MANUAL'} onClick={() => setMode('MANUAL')} icon={<Search size={18} />} label="Manual Search" />
            <TabButton active={mode === 'OCR'} onClick={() => setMode('OCR')} icon={<FileText size={18} />} label="Scan Slip" />
            <TabButton active={mode === 'AI'} onClick={() => setMode('AI')} icon={<Camera size={18} />} label="Scan Counter" />
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
              <div className="space-y-4 relative">
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
                {search.length > 1 && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-white border border-slate-200 shadow-xl rounded-xl mt-2 overflow-hidden max-h-80 overflow-y-auto">
                    {searchResults.length === 0 ? (
                      <div className="p-4 text-slate-500 text-center">No products found.</div>
                    ) : (
                      searchResults.map(p => (
                        <div key={p.id} onClick={() => addToCart(p)} className="flex justify-between items-center p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                          <div>
                            <p className="font-semibold text-slate-800">{p.name}</p>
                            <p className="text-xs text-slate-500">₹{(p.price || 0).toFixed(2)} / {p.baseQuantity === 1 ? '' : p.baseQuantity}{p.baseUnit} • {p.category}</p>
                          </div>
                          <Plus className="text-indigo-600 bg-indigo-50 rounded-md p-1" size={28} />
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {(mode === 'OCR' || mode === 'AI') && !isReviewing && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold">{mode === 'OCR' ? 'Upload Customer List slip' : 'Upload Counter Products Image'}</h3>
                  <p className="text-slate-500 text-sm mb-4">
                    {mode === 'OCR' ? "We'll read handwritten or printed text and match it." : "We'll detect actual products on the counter and match them."}
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

            {(mode === 'OCR' || mode === 'AI') && isReviewing && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold flex items-center gap-2"><CheckCircle className="text-emerald-500" /> Review Detected Items</h3>
                  <button onClick={() => setIsReviewing(false)} className="text-sm text-slate-500 hover:text-slate-800">Cancel</button>
                </div>

                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                  {reviewItems.map((item, idx) => (
                    <div key={idx} className={`p-4 border rounded-xl flex flex-col gap-3 transition-colors ${item.isRepeated ? 'border-amber-400 bg-amber-50 shadow-[0_0_12px_rgba(251,191,36,0.3)] relative' : item.productId ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50/30'}`}>
                      <div className="flex justify-between items-start">
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
                    </div>
                  ))}
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
              <div key={idx} className="bg-slate-800 p-3 rounded-xl border border-slate-700 relative group">
                <div className="flex justify-between items-start pr-6">
                  <div>
                    <p className="font-semibold text-sm line-clamp-1">{item.name}</p>
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
              placeholder="Customer Phone (Optional)"
              value={customerInfo.phone}
              onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
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
