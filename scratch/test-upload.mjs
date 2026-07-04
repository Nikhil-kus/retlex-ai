import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { readFileSync } from 'fs';

const firebaseConfig = {
  apiKey: 'AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk',
  authDomain: 'retlex-ai.firebaseapp.com',
  projectId: 'retlex-ai',
  storageBucket: 'retlex-ai.firebasestorage.app',
  messagingSenderId: '339712048398',
  appId: '1:339712048398:web:578ac498b0c942db7aab5f',
};
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

async function testUpload() {
  try {
    const storageRef = ref(storage, 'test/test.txt');
    const bytes = new Uint8Array(Buffer.from('Hello world'));
    await uploadBytes(storageRef, bytes);
    const url = await getDownloadURL(storageRef);
    console.log("Upload successful! URL:", url);
  } catch (e) {
    console.error("Upload failed:", e.message);
  }
  process.exit(0);
}

testUpload();
