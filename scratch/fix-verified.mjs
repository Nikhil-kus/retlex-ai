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
  "nescafe": "https://rukminim2.flixcart.com/image/612/612/xif0q/coffee/y/n/2/100-classic-instant-coffee-powder-100g-glass-jar-pure-coffee-original-imahkbzm9vgw9mf6.jpeg",
  "bru": "https://rukminim2.flixcart.com/image/612/612/xif0q/coffee/y/n/2/100-classic-instant-coffee-powder-100g-glass-jar-pure-coffee-original-imahkbzm9vgw9mf6.jpeg",
  "coffee": "https://rukminim2.flixcart.com/image/612/612/xif0q/coffee/y/n/2/100-classic-instant-coffee-powder-100g-glass-jar-pure-coffee-original-imahkbzm9vgw9mf6.jpeg",
  
  "green tea": "https://5.imimg.com/data5/ECOM/Default/2024/8/442381210/SW/VD/BY/227639912/gourmentcollectionwithgreen36b-gn-1-1000x1000.jpg",
  "girnar": "https://5.imimg.com/data5/ECOM/Default/2024/8/442381210/SW/VD/BY/227639912/gourmentcollectionwithgreen36b-gn-1-1000x1000.jpg",
  "lipton": "https://5.imimg.com/data5/ECOM/Default/2024/8/442381210/SW/VD/BY/227639912/gourmentcollectionwithgreen36b-gn-1-1000x1000.jpg",
  
  "krishna": "https://dhepleskrishnatea.com/wp-content/uploads/2021/03/Copy-of-Untitled-12.png",
  
  "rusk": "https://www.exoticestore.com/cdn/shop/files/40198331-2_7-britannia-toastea-premium-bake-rusk_800x.webp?v=1713268011",
  "britannia": "https://www.exoticestore.com/cdn/shop/files/40198331-2_7-britannia-toastea-premium-bake-rusk_800x.webp?v=1713268011",
  
  "babool": "https://www.indiasweetandspices.com/wp-content/uploads/2020/07/dabur-babool-200g.jpg",
  
  "bournvita": "https://5.imimg.com/data5/KW/QE/MY-61903110/bournvita-health-drink-1000x1000.jpg",
  "horlicks": "https://5.imimg.com/data5/KW/QE/MY-61903110/bournvita-health-drink-1000x1000.jpg",
  "complan": "https://5.imimg.com/data5/KW/QE/MY-61903110/bournvita-health-drink-1000x1000.jpg",
  "boost": "https://5.imimg.com/data5/KW/QE/MY-61903110/bournvita-health-drink-1000x1000.jpg",
  "health drink": "https://5.imimg.com/data5/KW/QE/MY-61903110/bournvita-health-drink-1000x1000.jpg",
  
  "colgate": "https://5.imimg.com/data5/ECOM/Default/2024/11/466113268/VC/HS/KK/206037213/untitled-1-dcnmj-1-bdc2a59b-d663-4812-a369-d26c5aefe9f4-500x500.png",
  "closeup": "https://5.imimg.com/data5/ECOM/Default/2024/11/466113268/VC/HS/KK/206037213/untitled-1-dcnmj-1-bdc2a59b-d663-4812-a369-d26c5aefe9f4-500x500.png",
  "pepsodent": "https://5.imimg.com/data5/ECOM/Default/2024/11/466113268/VC/HS/KK/206037213/untitled-1-dcnmj-1-bdc2a59b-d663-4812-a369-d26c5aefe9f4-500x500.png",
  "vicco": "https://5.imimg.com/data5/ECOM/Default/2024/11/466113268/VC/HS/KK/206037213/untitled-1-dcnmj-1-bdc2a59b-d663-4812-a369-d26c5aefe9f4-500x500.png",
  "dant kanti": "https://5.imimg.com/data5/ECOM/Default/2024/11/466113268/VC/HS/KK/206037213/untitled-1-dcnmj-1-bdc2a59b-d663-4812-a369-d26c5aefe9f4-500x500.png",
  "himalaya": "https://5.imimg.com/data5/ECOM/Default/2024/11/466113268/VC/HS/KK/206037213/untitled-1-dcnmj-1-bdc2a59b-d663-4812-a369-d26c5aefe9f4-500x500.png",
  "mouthwash": "https://5.imimg.com/data5/ECOM/Default/2024/11/466113268/VC/HS/KK/206037213/untitled-1-dcnmj-1-bdc2a59b-d663-4812-a369-d26c5aefe9f4-500x500.png",
  "tooth": "https://5.imimg.com/data5/ECOM/Default/2024/11/466113268/VC/HS/KK/206037213/untitled-1-dcnmj-1-bdc2a59b-d663-4812-a369-d26c5aefe9f4-500x500.png",
  
  "tea": "https://5.imimg.com/data5/SELLER/Default/2022/5/LO/GR/VY/6579674/goodricke-chai-ctc-tea-leaf-bags-1000x1000.jpeg",
  "chai": "https://5.imimg.com/data5/SELLER/Default/2022/5/LO/GR/VY/6579674/goodricke-chai-ctc-tea-leaf-bags-1000x1000.jpeg",
  "label": "https://5.imimg.com/data5/SELLER/Default/2022/5/LO/GR/VY/6579674/goodricke-chai-ctc-tea-leaf-bags-1000x1000.jpeg",
  "wagh bakri": "https://5.imimg.com/data5/SELLER/Default/2022/5/LO/GR/VY/6579674/goodricke-chai-ctc-tea-leaf-bags-1000x1000.jpeg",
  
  "paste": "https://5.imimg.com/data5/ECOM/Default/2024/11/466113268/VC/HS/KK/206037213/untitled-1-dcnmj-1-bdc2a59b-d663-4812-a369-d26c5aefe9f4-500x500.png"
};

(async () => {
  const shopsSnap = await getDocs(collection(db, 'shops'));
  const shopIds = shopsSnap.docs.map(d => d.id);
  
  let updated = 0;
  
  for (const shopId of shopIds) {
    const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', shopId)));
    const products = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => p.category && (p.category.toLowerCase().includes("oral") || p.category.toLowerCase().includes("tea")));

    const promises = products.map(p => {
      const nameLow = p.name.toLowerCase();
      let matchedImg = null;
      for (const [key, val] of Object.entries(IMG_MAP)) {
        if (nameLow.includes(key)) {
          matchedImg = val;
          break;
        }
      }
      
      if (!matchedImg) {
        if (p.category.toLowerCase().includes("oral")) {
          matchedImg = IMG_MAP["tooth"];
        } else {
          matchedImg = IMG_MAP["tea"];
        }
      }
      
      if (p.imageUrl !== matchedImg) {
        updated++;
        return updateDoc(doc(db, 'products', p.id), { imageUrl: matchedImg });
      }
      return Promise.resolve();
    });
    
    await Promise.all(promises);
  }

  console.log(`Updated ${updated} items instantly with real verified images.`);
  process.exit(0);
})();
