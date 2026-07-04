import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk',
  authDomain: 'retlex-ai.firebaseapp.com',
  projectId: 'retlex-ai',
  storageBucket: 'retlex-ai.firebasestorage.app',
  messagingSenderId: '339712048398',
  appId: '1:339712048398:web:578ac498b0c942db7aab5f',
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const IMG_MAP = {
  "horlicks": "https://www.bigbasket.com/media/uploads/p/l/266945_16-horlicks-health-nutrition-drink-classic-malt.jpg",
  "babool": "https://www.bigbasket.com/media/uploads/p/l/267023_8-dabur-babool-toothpaste.jpg",
  "nescafe sunrise": "https://www.bigbasket.com/media/uploads/p/l/100021312_2-nescafe-sunrise-instant-coffee.jpg",
  "bru instant": "https://www.bigbasket.com/media/uploads/p/l/266070_17-bru-instant-coffee.jpg",
  "red label": "https://www.bigbasket.com/media/uploads/p/l/240066_14-brooke-bond-red-label-tea.jpg",
  "everest tea masala": "https://www.bigbasket.com/media/uploads/p/l/119934_4-everest-tea-masala.jpg",
  "nescafe classic": "https://www.bigbasket.com/media/uploads/p/l/262923_14-nescafe-classic-instant-coffee.jpg",
  "bournvita": "https://www.bigbasket.com/media/uploads/p/l/103987_14-cadbury-bournvita-health-drink.jpg",
  "complan": "https://www.bigbasket.com/media/uploads/p/l/273393_12-complan-nutrition-health-drink-royale-chocolate.jpg",
  "cibaca": "https://www.bigbasket.com/media/uploads/p/l/266914_9-colgate-cibaca-anti-cavity-toothpaste.jpg",
  "kopiko": "https://www.bigbasket.com/media/uploads/p/l/40121110_4-kopiko-coffee-candy.jpg",
  "salt neem": "https://www.bigbasket.com/media/uploads/p/l/40099238_9-colgate-active-salt-neem-toothpaste.jpg",
  "lipton": "https://www.bigbasket.com/media/uploads/p/l/266961_16-lipton-green-tea-honey-lemon.jpg",
  "chai": "https://www.bigbasket.com/media/uploads/p/l/40008544_9-tata-tea-premium.jpg",
};

async function checkUrl(url) {
  if (!url || !url.startsWith("http")) return false;
  if (url.includes("tse1.mm.bing.net") || url.includes("fmcghouse.com") || url.includes("roopsi.in") || url.includes("incidecoder") || url.includes("exportersindia")) {
    return false;
  }
  return true;
}

(async () => {
  const shopId = 'Yvgf5Us3pdNGHa0ljBGr';
  const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
  const products = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p => p.category && (p.category.toLowerCase().includes("oral") || p.category.toLowerCase().includes("tea")));

  let updated = 0;
  for (const p of products) {
    const isOk = await checkUrl(p.imageUrl);
    if (!isOk) {
      let matchedImg = "https://www.bigbasket.com/media/uploads/p/l/40008544_9-tata-tea-premium.jpg"; // default fallback
      const nameLow = p.name.toLowerCase();
      
      for (const [key, val] of Object.entries(IMG_MAP)) {
        if (nameLow.includes(key)) {
          matchedImg = val;
          break;
        }
      }
      
      console.log(`Fixing ${p.name} with ${matchedImg}`);
      await updateDoc(doc(db, 'products', p.id), { imageUrl: matchedImg });
      updated++;
    }
  }

  console.log(`Updated ${updated} bad images with high-quality standard URLs.`);
  process.exit(0);
})();
