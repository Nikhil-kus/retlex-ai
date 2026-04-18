import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. Create Business Types
  const kiranaType = await prisma.businessType.upsert({
    where: { name: 'Kirana' },
    update: {},
    create: { name: 'Kirana' },
  })

  const tentHouseType = await prisma.businessType.upsert({
    where: { name: 'Tent House' },
    update: {},
    create: { name: 'Tent House' },
  })

  // 2. Create Tent House items
  const tentItems = [
    { name: "पर्दा", baseUnit: "pc" },
    { name: "सीलिंग", baseUnit: "pc" },
    { name: "दरी", baseUnit: "pc" },
    { name: "गद्दा", baseUnit: "pc" },
    { name: "गद्दा खोल सहित", baseUnit: "pc" },
    { name: "गोल तकिया", baseUnit: "pc" },
    { name: "पलंग", baseUnit: "pc" },
    { name: "पलंग खोल वाली", baseUnit: "pc" },
    { name: "भोजन पंडाल (टेंट)", baseUnit: "meter" },
    { name: "मीटिंग पंडाल", baseUnit: "meter" },
    { name: "जयमाला कुर्सी 1 सेट", baseUnit: "pc" },
    { name: "जयमाला सज स्टेज का फूल", baseUnit: "pc" },
    { name: "कुर्सी फाइबर", baseUnit: "pc" },
    { name: "पाइप गेट कपड़ा वाला", baseUnit: "pc" },
    { name: "लाइट सेट", baseUnit: "pc" },
    { name: "जनरेटर", baseUnit: "day" },
    { name: "कूलर", baseUnit: "pc" },
    { name: "पंखा", baseUnit: "pc" },
    { name: "सोफा", baseUnit: "pc" },
    { name: "फ्लावर डेकोरेशन", baseUnit: "day" },
    { name: "स्टेज", baseUnit: "day" },
    { name: "कारपेट", baseUnit: "meter" }, // "meter square" converted to meter for simplicity
    { name: "गंजा बड़े", baseUnit: "pc" },
    { name: "गंजा छोटे", baseUnit: "pc" },
    { name: "तेल कढ़ाई बड़ी", baseUnit: "pc" },
    { name: "तेल कढ़ाई छोटी", baseUnit: "pc" },
    { name: "खोवा कढ़ाई", baseUnit: "pc" },
    { name: "तसला", baseUnit: "pc" },
    { name: "तवा", baseUnit: "pc" },
    { name: "परातें", baseUnit: "pc" },
    { name: "मिठाई ट्रे", baseUnit: "pc" },
    { name: "गैस भट्टी डबल बर्नर", baseUnit: "pc" },
    { name: "ग्लास स्टील के", baseUnit: "pc" },
    { name: "चाय ट्रे", baseUnit: "pc" },
    { name: "पानी ट्रे", baseUnit: "pc" },
    { name: "चाय केतली", baseUnit: "pc" },
    { name: "ग्लास स्टैंड स्टील के", baseUnit: "pc" },
    { name: "बाल्टी स्टील की", baseUnit: "pc" },
    { name: "तसला स्टील के", baseUnit: "pc" },
    { name: "चौघड़ा", baseUnit: "pc" },
    { name: "प्लेट", baseUnit: "pc" },
    { name: "राइस प्लेट", baseUnit: "pc" },
    { name: "सब्जी डोंगा", baseUnit: "pc" },
    { name: "चम्मच", baseUnit: "pc" },
    { name: "डी.जे.", baseUnit: "day" },
    { name: "टेबल", baseUnit: "pc" },
    { name: "टेबल साइड कवर", baseUnit: "pc" },
    { name: "जनरेटर + CFL", baseUnit: "day" },
    { name: "कपड़ा गेट महाराजा", baseUnit: "pc" },
    { name: "कपड़ा गेट साधा", baseUnit: "pc" },
    { name: "लाइट झालर", baseUnit: "pc" },
    { name: "मंडप", baseUnit: "pc" },
    { name: "झूमर", baseUnit: "pc" },
    { name: "झूमर साधे", baseUnit: "pc" },
    { name: "पानी टंकी फाइबर की", baseUnit: "pc" },
    { name: "भट्टी सिंगल", baseUnit: "pc" }
  ];

  for (const item of tentItems) {
    const existing = await prisma.businessItem.findFirst({ where: { name: item.name, typeId: tentHouseType.id } });
    if (!existing) {
       await prisma.businessItem.create({
         data: {
           name: item.name,
           baseUnit: item.baseUnit,
           typeId: tentHouseType.id
         }
       });
    }
  }

  // 3. Create Default Shop (Kirana by default)
  const shop = await prisma.shop.upsert({
    where: { qrCodeId: 'shop-demo-123' },
    update: { businessTypeId: kiranaType.id },
    create: {
      name: 'Super Kirana Store',
      mobile: '9876543210',
      address: '123 Market Street, City',
      qrCodeId: 'shop-demo-123',
      businessTypeId: kiranaType.id
    },
  })

  // Sample kirana products
  const products = [
    { name: 'Tata Salt 1kg', price: 28, costPrice: 24, baseUnit: 'pc', baseQuantity: 1, category: 'Grocery' },
    { name: 'Aashirvaad Atta 5kg', price: 220, costPrice: 200, baseUnit: 'pc', baseQuantity: 1, category: 'Grocery' },
    { name: 'Lux Soap', price: 35, costPrice: 30, baseUnit: 'pc', baseQuantity: 1, category: 'Personal Care' },
    { name: 'Maggi Noodles 140g', price: 28, costPrice: 24, baseUnit: 'pc', baseQuantity: 1, category: 'Food' },
    { name: 'Amul Butter 100g', price: 56, costPrice: 50, baseUnit: 'g', baseQuantity: 100, category: 'Dairy' },
  ]

  for (const p of products) {
    const existing = await prisma.product.findFirst({ where: { name: p.name, shopId: shop.id }});
    if (!existing) {
        await prisma.product.create({
          data: {
            ...p,
            shopId: shop.id,
          }
        })
    }
  }

  console.log('Seed completed successfully')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
