import { notFound } from 'next/navigation';
import { nanoid } from 'nanoid';
import { ShowroomExperience } from '@/components/ShowroomExperience';
import {
  getCollections,
  getDealerProfile,
  getProducts,
  getSelectionById,
  resolveShareToken,
} from '@/lib/dataClient';
import type { DealerProfile, Product, Selection } from '@/lib/types';

export const dynamic = 'force-dynamic';

type ShowroomSearchParams = {
  dealer?: string;
  share?: string;
  selection?: string;
  view?: string;
};

export default async function ShowroomPage({
  searchParams,
}: {
  searchParams: ShowroomSearchParams;
}) {
  const dealerId = searchParams.dealer;
  const shareToken = searchParams.share ?? null;
  const selectionId = searchParams.selection;
  const highlightNewIntros = searchParams.view === 'new-intros';

  const [collections, products, dealer] = await Promise.all([
    getCollections(),
    getProducts(),
    dealerId ? getDealerProfile(dealerId) : Promise.resolve(null),
  ]);

  const recommended = products.filter((product) => product.isMarketRecommended).slice(0, 5);
  const previousBest = derivePreviousBest(products, dealer);

  let selection: Selection | null = null;
  let readOnly = false;

  if (shareToken) {
    const sharedSelectionId = resolveShareToken(shareToken) ?? shareToken;
    selection = sharedSelectionId ? await getSelectionById(sharedSelectionId) : null;
    readOnly = true;
  } else if (selectionId) {
    selection = await getSelectionById(selectionId);
  }

  if (!selection && dealer) {
    selection = buildStarterSelection(dealer, products);
  }

  if (!selection) {
    selection = createEmptySelection(dealerId ?? 'guest');
  }

  selection = ensureCollectionMetadata(selection, products);

  if (shareToken && !selection) {
    return notFound();
  }

  return (
    <ShowroomExperience
      collections={collections}
      products={products}
      dealer={dealer}
      recommended={recommended}
      previousBest={previousBest}
      initialSelection={selection}
      readOnly={readOnly}
      highlightNewIntros={highlightNewIntros}
      shareToken={shareToken}
    />
  );
}

function derivePreviousBest(products: Product[], dealer: DealerProfile | null) {
  if (dealer && dealer.previouslyPurchasedSkus.length > 0) {
    const map = new Map(products.map((product) => [product.sku, product]));
    return dealer.previouslyPurchasedSkus
      .map((sku) => map.get(sku))
      .filter((product): product is Product => Boolean(product))
      .slice(0, 5);
  }
  return products.slice(0, 5);
}

function buildStarterSelection(dealer: DealerProfile, products: Product[]): Selection | null {
  if (!dealer.starterSelectionSkus || dealer.starterSelectionSkus.length === 0) {
    return null;
  }
  const map = new Map(products.map((product) => [product.sku, product]));
  const lines = dealer.starterSelectionSkus
    .map((sku) => map.get(sku))
    .filter((product): product is Product => Boolean(product))
    .map((product) => ({
      sku: product.sku,
      qty: 1,
      notes: '',
      pickedBy: [],
      favorites: [],
      collectionId: product.collectionId,
    }));
  return {
    id: `sel_${nanoid(6)}`,
    dealerId: dealer.id,
    name: 'Dallas Market Selection',
    lines,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function createEmptySelection(dealerId: string): Selection {
  const now = new Date().toISOString();
  return {
    id: `sel_${nanoid(6)}`,
    dealerId,
    name: 'Dallas Market Selection',
    lines: [],
    createdAt: now,
    updatedAt: now,
  };
}

function ensureCollectionMetadata(selection: Selection, products: Product[]): Selection {
  const map = new Map(products.map((product) => [product.sku, product.collectionId]));
  return {
    ...selection,
    lines: selection.lines.map((line) => ({
      ...line,
      collectionId: line.collectionId ?? map.get(line.sku),
    })),
  };
}
