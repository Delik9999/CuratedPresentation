import { NextResponse } from 'next/server';
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';
import { getDealerProfile, getProducts, getSelectionById } from '@/lib/dataClient';

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1f2937',
  },
  heading: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 12,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 6,
    marginBottom: 6,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cell: {
    flex: 1,
    paddingRight: 8,
  },
  notes: {
    marginTop: 24,
    fontSize: 9,
    color: '#6b7280',
  },
});

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

  const dealer = await getDealerProfile(selection.dealerId);
  const productMap = new Map(products.map((product) => [product.sku, product]));

  const document = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>{selection.name}</Text>
        <Text style={styles.subheading}>
          Dealer: {dealer?.name ?? selection.dealerId} · Generated {new Date().toLocaleDateString()}
        </Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.cell, { flex: 0.8 }]}>SKU</Text>
          <Text style={[styles.cell, { flex: 1.6 }]}>Title</Text>
          <Text style={[styles.cell, { flex: 0.5 }]}>Qty</Text>
          <Text style={[styles.cell, { flex: 1.2 }]}>Notes</Text>
        </View>
        {selection.lines.map((line) => {
          const product = productMap.get(line.sku);
          return (
            <View key={line.sku} style={styles.tableRow}>
              <View style={[styles.cell, { flex: 0.8 }]}>
                <Text>{line.sku}</Text>
                {product?.images?.[0] && (
                  <Image
                    src={product.images[0]}
                    style={{ width: 60, height: 40, marginTop: 4, objectFit: 'cover' }}
                  />
                )}
              </View>
              <Text style={[styles.cell, { flex: 1.6 }]}>{product?.title ?? '—'}</Text>
              <Text style={[styles.cell, { flex: 0.5 }]}>{line.qty}</Text>
              <Text style={[styles.cell, { flex: 1.2 }]}>{line.notes ?? ''}</Text>
            </View>
          );
        })}
        <Text style={styles.notes}>
          Non-transactional preview. Contact your rep to finalize.
        </Text>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(document);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="selection-${selectionId}.pdf"`,
    },
  });
}
