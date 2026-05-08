/**
 * Seed Beauty & Personal Care products into Firestore
 * Usage: node scripts/seed-beauty-care.mjs
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}

const firebaseConfig = {
  apiKey: 'AIzaSyBnwCbkUgTYazDWVyOcyYNEdTYLgmND3Wk',
  authDomain: 'retlex-ai.firebaseapp.com',
  projectId: 'retlex-ai',
};
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const SHOP_ID = 'NjGBnhsc25w4jb2q6Ol4';
const IMG = {
  soap:        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Soap_-_bar_of_soap.jpg/320px-Soap_-_bar_of_soap.jpg',
  shampoo:     'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Shampoo_bottle.jpg/320px-Shampoo_bottle.jpg',
  toothpaste:  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Toothpaste_on_toothbrush.jpg/320px-Toothpaste_on_toothbrush.jpg',
  toothbrush:  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Toothbrush.jpg/320px-Toothbrush.jpg',
  mouthwash:   'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Mouthwash.jpg/320px-Mouthwash.jpg',
  handwash:    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Hand_washing_with_soap.jpg/320px-Hand_washing_with_soap.jpg',
  facecream:   'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Face_cream.jpg/320px-Face_cream.jpg',
  hairoil:     'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Coconut_oil.jpg/320px-Coconut_oil.jpg',
  powder:      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Talcum_powder.jpg/320px-Talcum_powder.jpg',
  moisturiser: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Vaseline.jpg/320px-Vaseline.jpg',
  deo:         'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Deodorant_spray.jpg/320px-Deodorant_spray.jpg',
  razor:       'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Safety_razor.jpg/320px-Safety_razor.jpg',
  shavgel:     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Shaving_cream.jpg/320px-Shaving_cream.jpg',
  hairremoval: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Hair_removal_cream.jpg/320px-Hair_removal_cream.jpg',
  aftershave:  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Aftershave.jpg/320px-Aftershave.jpg',
};

const PRODUCTS = [
  { name: 'Lux Soap 75g', localName: '???? ????? 75g', category: 'Soaps', price: 28, costPrice: 22, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 75, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Lux Soap 100g', localName: '???? ????? 100g', category: 'Soaps', price: 35, costPrice: 28, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Dove Soap 75g', localName: '?? ????? 75g', category: 'Soaps', price: 48, costPrice: 38, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 75, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Dove Soap 100g', localName: '?? ????? 100g', category: 'Soaps', price: 60, costPrice: 48, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Lifebuoy Soap 75g', localName: '??????? ????? 75g', category: 'Soaps', price: 22, costPrice: 17, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 75, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Lifebuoy Soap 100g', localName: '??????? ????? 100g', category: 'Soaps', price: 28, costPrice: 22, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Dettol Soap 75g', localName: '????? ????? 75g', category: 'Soaps', price: 38, costPrice: 30, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 75, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Dettol Soap 100g', localName: '????? ????? 100g', category: 'Soaps', price: 48, costPrice: 38, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Pears Soap 75g', localName: '?????? ????? 75g', category: 'Soaps', price: 55, costPrice: 44, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 75, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Pears Soap 100g', localName: '?????? ????? 100g', category: 'Soaps', price: 68, costPrice: 54, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Santoor Soap 75g', localName: '????? ????? 75g', category: 'Soaps', price: 25, costPrice: 20, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 75, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Santoor Soap 100g', localName: '????? ????? 100g', category: 'Soaps', price: 32, costPrice: 25, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Hamam Soap 75g', localName: '???? ????? 75g', category: 'Soaps', price: 22, costPrice: 17, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 75, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Hamam Soap 100g', localName: '???? ????? 100g', category: 'Soaps', price: 28, costPrice: 22, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Cinthol Soap 75g', localName: '?????? ????? 75g', category: 'Soaps', price: 28, costPrice: 22, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 75, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Cinthol Soap 100g', localName: '?????? ????? 100g', category: 'Soaps', price: 35, costPrice: 28, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Godrej No.1 Soap 75g', localName: '?????? ??.1 ????? 75g', category: 'Soaps', price: 18, costPrice: 14, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 75, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Godrej No.1 Soap 100g', localName: '?????? ??.1 ????? 100g', category: 'Soaps', price: 22, costPrice: 17, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Medimix Soap 75g', localName: '????????? ????? 75g', category: 'Soaps', price: 30, costPrice: 24, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 75, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Medimix Soap 100g', localName: '????????? ????? 100g', category: 'Soaps', price: 38, costPrice: 30, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Clinic Plus Shampoo 80ml', localName: '??????? ???? ?????? 80ml', category: 'Shampoo', price: 55, costPrice: 44, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 80, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Clinic Plus Shampoo 180ml', localName: '??????? ???? ?????? 180ml', category: 'Shampoo', price: 110, costPrice: 88, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 180, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Clinic Plus Shampoo 340ml', localName: '??????? ???? ?????? 340ml', category: 'Shampoo', price: 195, costPrice: 156, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 340, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Sunsilk Shampoo 80ml', localName: '??????? ?????? 80ml', category: 'Shampoo', price: 60, costPrice: 48, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 80, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Sunsilk Shampoo 180ml', localName: '??????? ?????? 180ml', category: 'Shampoo', price: 120, costPrice: 96, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 180, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Sunsilk Shampoo 340ml', localName: '??????? ?????? 340ml', category: 'Shampoo', price: 210, costPrice: 168, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 340, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Head & Shoulders Shampoo 80ml', localName: '??? ??? ???????? ?????? 80ml', category: 'Shampoo', price: 75, costPrice: 60, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 80, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Head & Shoulders Shampoo 180ml', localName: '??? ??? ???????? ?????? 180ml', category: 'Shampoo', price: 155, costPrice: 124, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 180, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Head & Shoulders Shampoo 340ml', localName: '??? ??? ???????? ?????? 340ml', category: 'Shampoo', price: 270, costPrice: 216, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 340, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Pantene Shampoo 80ml', localName: '?????? ?????? 80ml', category: 'Shampoo', price: 75, costPrice: 60, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 80, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Pantene Shampoo 180ml', localName: '?????? ?????? 180ml', category: 'Shampoo', price: 155, costPrice: 124, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 180, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Pantene Shampoo 340ml', localName: '?????? ?????? 340ml', category: 'Shampoo', price: 270, costPrice: 216, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 340, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Dove Shampoo 80ml', localName: '?? ?????? 80ml', category: 'Shampoo', price: 80, costPrice: 64, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 80, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Dove Shampoo 180ml', localName: '?? ?????? 180ml', category: 'Shampoo', price: 165, costPrice: 132, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 180, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Dove Shampoo 340ml', localName: '?? ?????? 340ml', category: 'Shampoo', price: 290, costPrice: 232, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 340, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'TRESemme Shampoo 80ml', localName: '???????? ?????? 80ml', category: 'Shampoo', price: 85, costPrice: 68, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 80, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'TRESemme Shampoo 180ml', localName: '???????? ?????? 180ml', category: 'Shampoo', price: 175, costPrice: 140, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 180, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'TRESemme Shampoo 340ml', localName: '???????? ?????? 340ml', category: 'Shampoo', price: 310, costPrice: 248, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 340, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Himalaya Shampoo 80ml', localName: '??????? ?????? 80ml', category: 'Shampoo', price: 65, costPrice: 52, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 80, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Himalaya Shampoo 180ml', localName: '??????? ?????? 180ml', category: 'Shampoo', price: 130, costPrice: 104, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 180, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Himalaya Shampoo 340ml', localName: '??????? ?????? 340ml', category: 'Shampoo', price: 230, costPrice: 184, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 340, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Biotique Shampoo 80ml', localName: '??????? ?????? 80ml', category: 'Shampoo', price: 70, costPrice: 56, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 80, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Biotique Shampoo 180ml', localName: '??????? ?????? 180ml', category: 'Shampoo', price: 140, costPrice: 112, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 180, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Biotique Shampoo 340ml', localName: '??????? ?????? 340ml', category: 'Shampoo', price: 250, costPrice: 200, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 340, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Colgate Toothpaste 50g', localName: '?????? ???????? 50g', category: 'Oral Care', price: 55, costPrice: 44, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 50, packetUnit: 'g', imageUrl: IMG.toothpaste, barcode: null, shopId: SHOP_ID },
  { name: 'Colgate Toothpaste 100g', localName: '?????? ???????? 100g', category: 'Oral Care', price: 95, costPrice: 76, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.toothpaste, barcode: null, shopId: SHOP_ID },
  { name: 'Colgate Toothpaste 200g', localName: '?????? ???????? 200g', category: 'Oral Care', price: 175, costPrice: 140, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 200, packetUnit: 'g', imageUrl: IMG.toothpaste, barcode: null, shopId: SHOP_ID },
  { name: 'Pepsodent Toothpaste 50g', localName: '?????????? ???????? 50g', category: 'Oral Care', price: 48, costPrice: 38, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 50, packetUnit: 'g', imageUrl: IMG.toothpaste, barcode: null, shopId: SHOP_ID },
  { name: 'Pepsodent Toothpaste 100g', localName: '?????????? ???????? 100g', category: 'Oral Care', price: 85, costPrice: 68, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.toothpaste, barcode: null, shopId: SHOP_ID },
  { name: 'Close Up Toothpaste 50g', localName: '????? ?? ???????? 50g', category: 'Oral Care', price: 50, costPrice: 40, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 50, packetUnit: 'g', imageUrl: IMG.toothpaste, barcode: null, shopId: SHOP_ID },
  { name: 'Close Up Toothpaste 100g', localName: '????? ?? ???????? 100g', category: 'Oral Care', price: 90, costPrice: 72, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.toothpaste, barcode: null, shopId: SHOP_ID },
  { name: 'Dabur Red Toothpaste 50g', localName: '???? ??? ???????? 50g', category: 'Oral Care', price: 52, costPrice: 42, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 50, packetUnit: 'g', imageUrl: IMG.toothpaste, barcode: null, shopId: SHOP_ID },
  { name: 'Dabur Red Toothpaste 100g', localName: '???? ??? ???????? 100g', category: 'Oral Care', price: 95, costPrice: 76, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.toothpaste, barcode: null, shopId: SHOP_ID },
  { name: 'Sensodyne Toothpaste 70g', localName: '????????? ???????? 70g', category: 'Oral Care', price: 145, costPrice: 116, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 70, packetUnit: 'g', imageUrl: IMG.toothpaste, barcode: null, shopId: SHOP_ID },
  { name: 'Colgate Mouthwash 250ml', localName: '?????? ??????? 250ml', category: 'Oral Care', price: 120, costPrice: 96, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 250, packetUnit: 'ml', imageUrl: IMG.mouthwash, barcode: null, shopId: SHOP_ID },
  { name: 'Oral-B Toothbrush', localName: '???-?? ???????', category: 'Oral Care', price: 45, costPrice: 36, baseUnit: 'pc', baseQuantity: 1, packetWeight: null, packetUnit: null, imageUrl: IMG.toothbrush, barcode: null, shopId: SHOP_ID },
  { name: 'Dettol Handwash 200ml', localName: '????? ??????? 200ml', category: 'Handwash', price: 85, costPrice: 68, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 200, packetUnit: 'ml', imageUrl: IMG.handwash, barcode: null, shopId: SHOP_ID },
  { name: 'Dettol Handwash 500ml', localName: '????? ??????? 500ml', category: 'Handwash', price: 185, costPrice: 148, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 500, packetUnit: 'ml', imageUrl: IMG.handwash, barcode: null, shopId: SHOP_ID },
  { name: 'Lifebuoy Handwash 200ml', localName: '??????? ??????? 200ml', category: 'Handwash', price: 75, costPrice: 60, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 200, packetUnit: 'ml', imageUrl: IMG.handwash, barcode: null, shopId: SHOP_ID },
  { name: 'Lifebuoy Handwash 500ml', localName: '??????? ??????? 500ml', category: 'Handwash', price: 165, costPrice: 132, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 500, packetUnit: 'ml', imageUrl: IMG.handwash, barcode: null, shopId: SHOP_ID },
  { name: 'Savlon Handwash 200ml', localName: '?????? ??????? 200ml', category: 'Handwash', price: 80, costPrice: 64, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 200, packetUnit: 'ml', imageUrl: IMG.handwash, barcode: null, shopId: SHOP_ID },
  { name: 'Himalaya Handwash 250ml', localName: '??????? ??????? 250ml', category: 'Handwash', price: 90, costPrice: 72, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 250, packetUnit: 'ml', imageUrl: IMG.handwash, barcode: null, shopId: SHOP_ID },
  { name: 'Glow & Lovely Face Cream 25g', localName: '???? ??? ???? ??? ????? 25g', category: 'Face Creams', price: 55, costPrice: 44, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 25, packetUnit: 'g', imageUrl: IMG.facecream, barcode: null, shopId: SHOP_ID },
  { name: 'Glow & Lovely Face Cream 50g', localName: '???? ??? ???? ??? ????? 50g', category: 'Face Creams', price: 95, costPrice: 76, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 50, packetUnit: 'g', imageUrl: IMG.facecream, barcode: null, shopId: SHOP_ID },
  { name: "Pond’s Cold Cream 35g", localName: '??????? ????? ????? 35g', category: 'Face Creams', price: 65, costPrice: 52, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 35, packetUnit: 'g', imageUrl: IMG.facecream, barcode: null, shopId: SHOP_ID },
  { name: "Pond’s Cold Cream 75g", localName: '??????? ????? ????? 75g', category: 'Face Creams', price: 120, costPrice: 96, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 75, packetUnit: 'g', imageUrl: IMG.facecream, barcode: null, shopId: SHOP_ID },
  { name: 'Nivea Face Cream 50ml', localName: '?????? ??? ????? 50ml', category: 'Face Creams', price: 145, costPrice: 116, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 50, packetUnit: 'ml', imageUrl: IMG.facecream, barcode: null, shopId: SHOP_ID },
  { name: 'Nivea Face Cream 100ml', localName: '?????? ??? ????? 100ml', category: 'Face Creams', price: 265, costPrice: 212, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'ml', imageUrl: IMG.facecream, barcode: null, shopId: SHOP_ID },
  { name: 'Lakme Face Cream 25g', localName: '?????? ??? ????? 25g', category: 'Face Creams', price: 85, costPrice: 68, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 25, packetUnit: 'g', imageUrl: IMG.facecream, barcode: null, shopId: SHOP_ID },
  { name: 'Himalaya Face Cream 50g', localName: '??????? ??? ????? 50g', category: 'Face Creams', price: 95, costPrice: 76, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 50, packetUnit: 'g', imageUrl: IMG.facecream, barcode: null, shopId: SHOP_ID },
  { name: 'Parachute Coconut Oil 100ml', localName: '??????? ?????? ??? 100ml', category: 'Hair Oil', price: 55, costPrice: 44, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'ml', imageUrl: IMG.hairoil, barcode: null, shopId: SHOP_ID },
  { name: 'Parachute Coconut Oil 200ml', localName: '??????? ?????? ??? 200ml', category: 'Hair Oil', price: 100, costPrice: 80, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 200, packetUnit: 'ml', imageUrl: IMG.hairoil, barcode: null, shopId: SHOP_ID },
  { name: 'Parachute Coconut Oil 500ml', localName: '??????? ?????? ??? 500ml', category: 'Hair Oil', price: 230, costPrice: 184, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 500, packetUnit: 'ml', imageUrl: IMG.hairoil, barcode: null, shopId: SHOP_ID },
  { name: 'Dabur Amla Hair Oil 100ml', localName: '???? ????? ???? ??? 100ml', category: 'Hair Oil', price: 65, costPrice: 52, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'ml', imageUrl: IMG.hairoil, barcode: null, shopId: SHOP_ID },
  { name: 'Dabur Amla Hair Oil 200ml', localName: '???? ????? ???? ??? 200ml', category: 'Hair Oil', price: 120, costPrice: 96, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 200, packetUnit: 'ml', imageUrl: IMG.hairoil, barcode: null, shopId: SHOP_ID },
  { name: 'Bajaj Almond Hair Oil 100ml', localName: '???? ????? ???? ??? 100ml', category: 'Hair Oil', price: 75, costPrice: 60, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'ml', imageUrl: IMG.hairoil, barcode: null, shopId: SHOP_ID },
  { name: 'Bajaj Almond Hair Oil 200ml', localName: '???? ????? ???? ??? 200ml', category: 'Hair Oil', price: 140, costPrice: 112, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 200, packetUnit: 'ml', imageUrl: IMG.hairoil, barcode: null, shopId: SHOP_ID },
  { name: 'Vatika Hair Oil 100ml', localName: '?????? ???? ??? 100ml', category: 'Hair Oil', price: 80, costPrice: 64, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'ml', imageUrl: IMG.hairoil, barcode: null, shopId: SHOP_ID },
  { name: 'Vatika Hair Oil 200ml', localName: '?????? ???? ??? 200ml', category: 'Hair Oil', price: 150, costPrice: 120, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 200, packetUnit: 'ml', imageUrl: IMG.hairoil, barcode: null, shopId: SHOP_ID },
  { name: 'Nihar Naturals Hair Oil 100ml', localName: '????? ???????? ???? ??? 100ml', category: 'Hair Oil', price: 60, costPrice: 48, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'ml', imageUrl: IMG.hairoil, barcode: null, shopId: SHOP_ID },
  { name: 'Nihar Naturals Hair Oil 200ml', localName: '????? ???????? ???? ??? 200ml', category: 'Hair Oil', price: 110, costPrice: 88, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 200, packetUnit: 'ml', imageUrl: IMG.hairoil, barcode: null, shopId: SHOP_ID },
  { name: 'Pond’s Talc Powder 100g', localName: '??????? ????? ????? 100g', category: 'Powder', price: 75, costPrice: 60, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.powder, barcode: null, shopId: SHOP_ID },
  { name: 'Pond’s Talc Powder 200g', localName: '??????? ????? ????? 200g', category: 'Powder', price: 130, costPrice: 104, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 200, packetUnit: 'g', imageUrl: IMG.powder, barcode: null, shopId: SHOP_ID },
  { name: 'Johnson’s Baby Powder 100g', localName: '????? ???? ????? 100g', category: 'Powder', price: 95, costPrice: 76, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.powder, barcode: null, shopId: SHOP_ID },
  { name: 'Johnson’s Baby Powder 200g', localName: '????? ???? ????? 200g', category: 'Powder', price: 170, costPrice: 136, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 200, packetUnit: 'g', imageUrl: IMG.powder, barcode: null, shopId: SHOP_ID },
  { name: 'Nycil Prickly Heat Powder 100g', localName: '?????? ??????? ??? ????? 100g', category: 'Powder', price: 80, costPrice: 64, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.powder, barcode: null, shopId: SHOP_ID },
  { name: 'Nycil Prickly Heat Powder 150g', localName: '?????? ??????? ??? ????? 150g', category: 'Powder', price: 110, costPrice: 88, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 150, packetUnit: 'g', imageUrl: IMG.powder, barcode: null, shopId: SHOP_ID },
  { name: 'Boroplus Prickly Heat Powder 100g', localName: '???????? ??????? ??? ????? 100g', category: 'Powder', price: 75, costPrice: 60, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.powder, barcode: null, shopId: SHOP_ID },
  { name: 'Vaseline Body Lotion 50ml', localName: '?????? ???? ???? 50ml', category: 'Moisturisers', price: 75, costPrice: 60, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 50, packetUnit: 'ml', imageUrl: IMG.moisturiser, barcode: null, shopId: SHOP_ID },
  { name: 'Vaseline Body Lotion 100ml', localName: '?????? ???? ???? 100ml', category: 'Moisturisers', price: 130, costPrice: 104, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'ml', imageUrl: IMG.moisturiser, barcode: null, shopId: SHOP_ID },
  { name: 'Nivea Body Lotion 100ml', localName: '?????? ???? ???? 100ml', category: 'Moisturisers', price: 145, costPrice: 116, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'ml', imageUrl: IMG.moisturiser, barcode: null, shopId: SHOP_ID },
  { name: 'Nivea Body Lotion 200ml', localName: '?????? ???? ???? 200ml', category: 'Moisturisers', price: 265, costPrice: 212, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 200, packetUnit: 'ml', imageUrl: IMG.moisturiser, barcode: null, shopId: SHOP_ID },
  { name: 'Parachute Advansed Body Lotion 100ml', localName: '??????? ???????? ???? ???? 100ml', category: 'Moisturisers', price: 110, costPrice: 88, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'ml', imageUrl: IMG.moisturiser, barcode: null, shopId: SHOP_ID },
  { name: 'Himalaya Body Lotion 100ml', localName: '??????? ???? ???? 100ml', category: 'Moisturisers', price: 120, costPrice: 96, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'ml', imageUrl: IMG.moisturiser, barcode: null, shopId: SHOP_ID },
  { name: 'Gillette Mach3 Razor', localName: '????? ???3 ????', category: 'Grooming', price: 175, costPrice: 140, baseUnit: 'pc', baseQuantity: 1, packetWeight: null, packetUnit: null, imageUrl: IMG.razor, barcode: null, shopId: SHOP_ID },
  { name: 'Gillette Fusion Razor', localName: '????? ?????? ????', category: 'Grooming', price: 295, costPrice: 236, baseUnit: 'pc', baseQuantity: 1, packetWeight: null, packetUnit: null, imageUrl: IMG.razor, barcode: null, shopId: SHOP_ID },
  { name: 'Veet Hair Removal Cream 25g', localName: '??? ???? ?????? ????? 25g', category: 'Grooming', price: 85, costPrice: 68, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 25, packetUnit: 'g', imageUrl: IMG.hairremoval, barcode: null, shopId: SHOP_ID },
  { name: 'Veet Hair Removal Cream 50g', localName: '??? ???? ?????? ????? 50g', category: 'Grooming', price: 145, costPrice: 116, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 50, packetUnit: 'g', imageUrl: IMG.hairremoval, barcode: null, shopId: SHOP_ID },
  { name: 'Gillette Shaving Gel 60g', localName: '????? ?????? ??? 60g', category: 'Grooming', price: 175, costPrice: 140, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 60, packetUnit: 'g', imageUrl: IMG.shavgel, barcode: null, shopId: SHOP_ID },
  { name: 'Old Spice Aftershave 50ml', localName: '???? ?????? ???????? 50ml', category: 'Grooming', price: 145, costPrice: 116, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 50, packetUnit: 'ml', imageUrl: IMG.aftershave, barcode: null, shopId: SHOP_ID },
  { name: 'Axe Deodorant 150ml', localName: '???? ?????????? 150ml', category: 'Grooming', price: 195, costPrice: 156, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 150, packetUnit: 'ml', imageUrl: IMG.deo, barcode: null, shopId: SHOP_ID },
  { name: 'Fogg Deodorant 120ml', localName: '??? ?????????? 120ml', category: 'Grooming', price: 225, costPrice: 180, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 120, packetUnit: 'ml', imageUrl: IMG.deo, barcode: null, shopId: SHOP_ID },
  { name: 'Wild Stone Deodorant 150ml', localName: '?????? ????? ?????????? 150ml', category: 'Grooming', price: 195, costPrice: 156, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 150, packetUnit: 'ml', imageUrl: IMG.deo, barcode: null, shopId: SHOP_ID },
  { name: 'Fiama Soap 75g', localName: '?????? ????? 75g', category: 'Soaps', price: 45, costPrice: 36, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 75, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Fiama Soap 100g', localName: '?????? ????? 100g', category: 'Soaps', price: 58, costPrice: 46, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Palmolive Soap 75g', localName: '??????? ????? 75g', category: 'Soaps', price: 38, costPrice: 30, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 75, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Palmolive Soap 100g', localName: '??????? ????? 100g', category: 'Soaps', price: 48, costPrice: 38, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.soap, barcode: null, shopId: SHOP_ID },
  { name: 'Mamaearth Onion Shampoo 250ml', localName: '???????? ????? ?????? 250ml', category: 'Shampoo', price: 349, costPrice: 279, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 250, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'WOW Apple Cider Vinegar Shampoo 300ml', localName: '??? ????? ????? ?????? ?????? 300ml', category: 'Shampoo', price: 399, costPrice: 319, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 300, packetUnit: 'ml', imageUrl: IMG.shampoo, barcode: null, shopId: SHOP_ID },
  { name: 'Colgate Charcoal Toothpaste 120g', localName: '?????? ?????? ???????? 120g', category: 'Oral Care', price: 145, costPrice: 116, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 120, packetUnit: 'g', imageUrl: IMG.toothpaste, barcode: null, shopId: SHOP_ID },
  { name: 'Himalaya Toothpaste 100g', localName: '??????? ???????? 100g', category: 'Oral Care', price: 85, costPrice: 68, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.toothpaste, barcode: null, shopId: SHOP_ID },
  { name: 'Patanjali Dant Kanti Toothpaste 100g', localName: '?????? ??? ????? ???????? 100g', category: 'Oral Care', price: 75, costPrice: 60, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'g', imageUrl: IMG.toothpaste, barcode: null, shopId: SHOP_ID },
  { name: 'Colgate 360 Toothbrush', localName: '?????? 360 ???????', category: 'Oral Care', price: 55, costPrice: 44, baseUnit: 'pc', baseQuantity: 1, packetWeight: null, packetUnit: null, imageUrl: IMG.toothbrush, barcode: null, shopId: SHOP_ID },
  { name: 'Listerine Mouthwash 250ml', localName: '???????? ??????? 250ml', category: 'Oral Care', price: 145, costPrice: 116, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 250, packetUnit: 'ml', imageUrl: IMG.mouthwash, barcode: null, shopId: SHOP_ID },
  { name: 'Godrej Protekt Handwash 200ml', localName: '?????? ????????? ??????? 200ml', category: 'Handwash', price: 70, costPrice: 56, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 200, packetUnit: 'ml', imageUrl: IMG.handwash, barcode: null, shopId: SHOP_ID },
  { name: 'Palmolive Handwash 250ml', localName: '??????? ??????? 250ml', category: 'Handwash', price: 85, costPrice: 68, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 250, packetUnit: 'ml', imageUrl: IMG.handwash, barcode: null, shopId: SHOP_ID },
  { name: 'Olay Total Effects Cream 50g', localName: '??? ???? ???????? ????? 50g', category: 'Face Creams', price: 395, costPrice: 316, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 50, packetUnit: 'g', imageUrl: IMG.facecream, barcode: null, shopId: SHOP_ID },
  { name: 'Garnier Skin Naturals Cream 45g', localName: '???????? ????? ???????? ????? 45g', category: 'Face Creams', price: 145, costPrice: 116, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 45, packetUnit: 'g', imageUrl: IMG.facecream, barcode: null, shopId: SHOP_ID },
  { name: 'Emami Fair & Handsome Cream 30g', localName: '????? ???? ??? ?????? ????? 30g', category: 'Face Creams', price: 85, costPrice: 68, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 30, packetUnit: 'g', imageUrl: IMG.facecream, barcode: null, shopId: SHOP_ID },
  { name: 'Kesh King Hair Oil 100ml', localName: '??? ???? ???? ??? 100ml', category: 'Hair Oil', price: 145, costPrice: 116, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'ml', imageUrl: IMG.hairoil, barcode: null, shopId: SHOP_ID },
  { name: 'Indulekha Bringha Hair Oil 100ml', localName: '???????? ????? ???? ??? 100ml', category: 'Hair Oil', price: 295, costPrice: 236, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'ml', imageUrl: IMG.hairoil, barcode: null, shopId: SHOP_ID },
  { name: 'Himalaya Anti-Dandruff Hair Oil 100ml', localName: '??????? ????-??????? ???? ??? 100ml', category: 'Hair Oil', price: 120, costPrice: 96, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'ml', imageUrl: IMG.hairoil, barcode: null, shopId: SHOP_ID },
  { name: 'Cetaphil Moisturising Lotion 100ml', localName: '??????? ????????????? ???? 100ml', category: 'Moisturisers', price: 395, costPrice: 316, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 100, packetUnit: 'ml', imageUrl: IMG.moisturiser, barcode: null, shopId: SHOP_ID },
  { name: 'Lakme Peach Milk Moisturiser 60ml', localName: '?????? ??? ????? ??????????? 60ml', category: 'Moisturisers', price: 145, costPrice: 116, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 60, packetUnit: 'ml', imageUrl: IMG.moisturiser, barcode: null, shopId: SHOP_ID },
  { name: 'Biotique Bio Coconut Whitening Lotion 190ml', localName: '??????? ???? ?????? ???? 190ml', category: 'Moisturisers', price: 175, costPrice: 140, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 190, packetUnit: 'ml', imageUrl: IMG.moisturiser, barcode: null, shopId: SHOP_ID },
  { name: 'Gillette Guard Razor', localName: '????? ????? ????', category: 'Grooming', price: 35, costPrice: 28, baseUnit: 'pc', baseQuantity: 1, packetWeight: null, packetUnit: null, imageUrl: IMG.razor, barcode: null, shopId: SHOP_ID },
  { name: 'Park Avenue Shaving Cream 70g', localName: '????? ??????? ?????? ????? 70g', category: 'Grooming', price: 95, costPrice: 76, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 70, packetUnit: 'g', imageUrl: IMG.shavgel, barcode: null, shopId: SHOP_ID },
  { name: 'Engage Deodorant 150ml', localName: '????? ?????????? 150ml', category: 'Grooming', price: 175, costPrice: 140, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 150, packetUnit: 'ml', imageUrl: IMG.deo, barcode: null, shopId: SHOP_ID },
  { name: 'Denver Deodorant 165ml', localName: '????? ?????????? 165ml', category: 'Grooming', price: 195, costPrice: 156, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 165, packetUnit: 'ml', imageUrl: IMG.deo, barcode: null, shopId: SHOP_ID },
  { name: 'Nivea Men Deodorant 150ml', localName: '?????? ??? ?????????? 150ml', category: 'Grooming', price: 225, costPrice: 180, baseUnit: 'pkt', baseQuantity: 1, packetWeight: 150, packetUnit: 'ml', imageUrl: IMG.deo, barcode: null, shopId: SHOP_ID },
];


async function main() {
  console.log('\n???  Seeding Beauty & Personal Care products for shop:', SHOP_ID);
  console.log('?? Total products to process:', PRODUCTS.length);

  // Fetch existing products to skip duplicates
  const existingSnap = await getDocs(query(collection(db, 'products'), where('shopId', '==', SHOP_ID)));
  const existingNames = new Set(existingSnap.docs.map(d => d.data().name?.toLowerCase().trim()));
  console.log('?? Existing products in shop:', existingNames.size);

  let added = 0, skipped = 0;

  for (const item of PRODUCTS) {
    const key = item.name.toLowerCase().trim();
    if (existingNames.has(key)) {
      console.log('  ??  Skip:', item.name);
      skipped++;
      continue;
    }
    await addDoc(collection(db, 'products'), item);
    console.log('  ? Added:', item.name, '� ?' + item.price);
    added++;
  }

  console.log('\n-----------------------------------------');
  console.log('? Added   :', added);
  console.log('??  Skipped :', skipped);
  console.log('?? Total   :', PRODUCTS.length);
  console.log('-----------------------------------------\n');
  process.exit(0);
}

main().catch(e => { console.error('? Error:', e); process.exit(1); });
