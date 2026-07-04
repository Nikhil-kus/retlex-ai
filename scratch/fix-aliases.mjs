import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

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

const mapping = {
  'Kali Til': ['Kali til', 'काली तिल'],
  'Maggi Masala': ['Maigi masala', 'मैगी मसाला'],
  'Kala Namak': ['Kala namak', 'काला नमक'],
  'Moongfali': ['Falli dana', 'moongfali', 'Falli dana/moongfali', 'मूंगफली'],
  'Soyabean Bari': ['Bari', 'soyabeen bari', 'Bari/soyabeen bari', 'सोयाबीन बरी'],
  'Chawal Aata': ['Chawal aata', 'चावल आटा'],
  'Acid Bottle 1L': ['acid bottle', '20 rupee botle of 1 liter', 'एसिड बोतल'],
  'Dr. Phenyl': ['dr. phinyl', 'डॉ फिनाइल'],
  'Everest Hingraj': ['hingraj everest hing', 'एवरेस्ट हींग'],
  'Parmal Packet': ['Parmal 1 packet 45', 'परमल पैकेट'],
  'Makka Poha': ['Makka poha - 60 rupees kilo', 'मक्का पोहा'],
  'Mulethi': ['mulethi', 'मुलेठी'],
  'Hair Care Aloe Vera': ['hair care alovera', 'हेयर एंड केयर एलोवेरा'],
  'Fun Top Tomato Sauce Bottle': ['tomato suas bottle', 'टमाटर सॉस बोतल'],
  'Fun Top Chilli Sauce Bottle': ['chilli saus bottle', 'चिल्ली सॉस बोतल'],
  'Fun Top Tomato Sauce Pouch': ['tomato sause big packet of small 1 rupees packets', 'टमाटर सॉस पैकेट (₹1)']
};

(async () => {
  console.log("Fetching products...");
  const snap = await getDocs(collection(db, 'products'));
  let updated = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (mapping[data.name]) {
      // Check if localAliases exists and matches exactly, to save writes
      // But let's just write them all to be sure
      const aliases = mapping[data.name];
      await updateDoc(doc(db, 'products', d.id), { localAliases: aliases });
      updated++;
      console.log(`Updated ${data.name} (${d.id}) with aliases:`, aliases);
    }
  }
  console.log(`Updated ${updated} products with correct aliases!`);
  process.exit(0);
})();
