import { NextResponse } from 'next/server';
// import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.shopId || !data.items || data.items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // const shop = await prisma.shop.findUnique({
    //   where: { id: data.shopId },
    //   include: { businessType: true }
    // });
    const shop = { businessType: { name: "General" } };
    const isTentHouse = shop?.businessType?.name === 'Tent House';

    const billNumber = `BILL-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    let totalAmount = 0;
    let totalProfit = 0;

    const itemsData = data.items.map((item: any) => {
      const baseUnit = item.baseUnit || 'pc';
      const scannedUnit = item.unit || baseUnit;
      const baseQuantity = item.baseQuantity || 1;
      const price = item.price || 0;
      const unitCost = item.costPrice || 0;

      let finalPrice = 0;
      let totalCost = 0;

      if (isTentHouse) {
        finalPrice = item.quantity * price;
        totalCost = item.quantity * unitCost;
      } else {
        if (baseUnit === 'pc' || scannedUnit === 'pc') {
          finalPrice = item.quantity * price;
          totalCost = item.quantity * unitCost;
        } else {
          let qBase = item.quantity;
          if (scannedUnit === 'kg' || scannedUnit === 'ltr') qBase *= 1000;

          let bBase = baseQuantity;
          if (baseUnit === 'kg' || baseUnit === 'ltr') bBase *= 1000;

          finalPrice = (qBase / bBase) * price;
          totalCost = (qBase / bBase) * unitCost;
        }
      }

      const profit = finalPrice - totalCost;

      totalAmount += finalPrice;
      totalProfit += profit;

      return {
        productId: item.productId || null,
        name: item.name,
        quantity: parseFloat(item.quantity),
        unit: scannedUnit, // PRESERVES EXACTLY WHAT WAS SCANNED (e.g., 'g')
        sellingPrice: price,
        costPrice: unitCost,
        total: finalPrice
      };
    });

    // const bill = await prisma.bill.create({
    //   data: {
    //     billNumber,
    //     shopId: data.shopId,
    //     customerName: data.customerName || null,
    //     customerPhone: data.customerPhone || null,
    //     totalAmount,
    //     profit: totalProfit,
    //     status: data.status || 'UNPAID',
    //     paymentMethod: data.paymentMethod || null,
    //     notes: data.notes || null,
    //     items: {
    //       create: itemsData
    //     }
    //   },
    //   include: { items: true }
    // });
    const bill = {
      id: "temp-id",
      message: "Prisma disabled temporarily"
    };

    return NextResponse.json(bill);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    if (!shopId) return NextResponse.json({ error: 'Shop ID required' }, { status: 400 });

    const bills = await prisma.bill.findMany({
      where: { shopId },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(bills);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch bills' }, { status: 500 });
  }
}
