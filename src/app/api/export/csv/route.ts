import { NextResponse } from 'next/server';
import { getProducts, getSelectionById } from '@/lib/dataClient';

export async function POST(request: Request) {
  const body = await request.json();
  const selectionId: string | undefined = body.selectionId;
  if (!selectionId) {
    return NextResponse.json({ error: 'Missing selection id' }, { status: 400 });
  }

  const [selection, products] = await Promise.all([
    getSelectionById(selectionId),
    getProducts(),
  ]);

  if (!selection) {
    return NextResponse.json({ error: 'Selection not found' }, { status: 404 });
  }

  const productMap = new Map(products.map((product) => [product.sku, product]));

  const rows = selection.lines.map((line) => {
    const product = productMap.get(line.sku);
    return [
      line.sku,
      product?.title ?? '',
      line.qty.toString(),
      product?.price.dealerNet?.toString() ?? product?.price.msrp.toString() ?? '',
      line.notes ?? '',
    ];
  });

  const csv = [
    ['sku', 'title', 'qty', 'price_tier', 'notes'],
    ...rows,
  ]
    .map((row) => row.map((value) => `"${(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="selection-${selectionId}.csv"`,
    },
  });
}
