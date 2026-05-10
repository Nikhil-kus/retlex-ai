import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk',
  authDomain: 'retlex-ai.firebaseapp.com',
  projectId: 'retlex-ai',
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

function getHindi(name) {
  const n = name.toLowerCase();
  if (n.includes('johnson') && n.includes('100')) return 'जॉनसन बेबी पाउडर 100 ग्राम';
  if (n.includes('johnson') && n.includes('200')) return 'जॉनसन बेबी पाउडर 200 ग्राम';
  if (n.includes('pond') && n.includes('talc') && n.includes('100')) return 'पॉन्ड्स टैल्क पाउडर 100 ग्राम';
  if (n.includes('pond') && n.includes('talc') && n.includes('200')) return 'पॉन्ड्स टैल्क पाउडर 200 ग्राम';
  if (n.includes('pond') && n.includes('cold') && n.includes('35')) return 'पॉन्ड्स कोल्ड क्रीम 35 ग्राम';
  if (n.includes('pond') && n.includes('cold') && n.includes('75')) return 'पॉन्ड्स कोल्ड क्रीम 75 ग्राम';
  return null;
}

const snap = await getDocs(query(collection(db, 'products'), where('shopId', '==', 'NjGBnhsc25w4jb2q6Ol4')));
let fixed = 0;
for (const d of snap.docs) {
  const { name, localName } = d.data();
  if (!localName || localName.includes('?')) {
    const hindi = getHindi(name);
    if (hindi) {
      await updateDoc(doc(db, 'products', d.id), { localName: hindi });
      console.log('✅', name, '->', hindi);
      fixed++;
    }
  }
}
console.log('Fixed:', fixed);
process.exit(0);
