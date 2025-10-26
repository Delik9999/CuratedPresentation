'use client';

import { useMemo, useState } from 'react';
import { CollectionSection } from './CollectionSection';
import { RecommendationRow } from './RecommendationRow';
import { SelectionPanel } from './SelectionPanel';
import { SelectionInitializer } from './SelectionInitializer';
import type {
  Collection,
  DealerProfile,
  Product,
  Selection,
} from '@/lib/types';
import { useSelectionStore } from '@/hooks/useSelectionStore';

export type ShowroomExperienceProps = {
  collections: Collection[];
  products: Product[];
  dealer?: DealerProfile | null;
  recommended: Product[];
  previousBest: Product[];
  initialSelection: Selection | null;
  readOnly?: boolean;
  highlightNewIntros?: boolean;
  shareToken?: string | null;
};

export function ShowroomExperience({
  collections,
  products,
  dealer,
  recommended,
  previousBest,
  initialSelection,
  readOnly,
  highlightNewIntros,
  shareToken,
}: ShowroomExperienceProps) {
  const [search, setSearch] = useState('');
  const [locked, setLocked] = useState(Boolean(readOnly));
  const [shareBannerDismissed, setShareBannerDismissed] = useState(false);
  const replaceSelection = useSelectionStore((state) => state.replaceSelection);

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    const query = search.toLowerCase();
    return products.filter((product) => {
      if (product.title.toLowerCase().includes(query)) return true;
      if (product.sku.toLowerCase().includes(query)) return true;
      if (product.collectionId.toLowerCase().includes(query)) return true;
      return Object.entries(product.specs).some(([key, value]) => {
        return (
          key.toLowerCase().includes(query) ||
          String(value).toLowerCase().includes(query)
        );
      });
    });
  }, [products, search]);

  const productsByCollection = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const product of filteredProducts) {
      if (highlightNewIntros && !product.isNewIntro) continue;
      const arr = map.get(product.collectionId) ?? [];
      arr.push(product);
      map.set(product.collectionId, arr);
    }
    return map;
  }, [filteredProducts, highlightNewIntros]);

  const previouslyPurchasedSkus = dealer?.previouslyPurchasedSkus ?? [];

  const duplicateAndEdit = async () => {
    if (!initialSelection) return;
    try {
      const response = await fetch('/api/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'duplicate',
          selectionId: initialSelection.id,
          dealerId: dealer?.id ?? initialSelection.dealerId,
        }),
      });
      if (!response.ok) throw new Error('Duplicate failed');
      const json = await response.json();
      replaceSelection(json.selection);
      setLocked(false);
    } catch (error) {
      console.error(error);
      alert('Unable to duplicate right now. Try again in a moment.');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_360px]">
      <SelectionInitializer selection={initialSelection} />
      <section className="lg:col-span-1">
        <div id="search" className="sticky top-0 z-10 bg-slate-50 pb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">
                {dealer ? `Welcome back—here’s your Dallas Market Selection.` : 'Curated showroom collections'}
              </h1>
              {dealer && (
                <p className="text-sm text-slate-500">
                  Viewing {dealer.name} · Pricing tier: {dealer.priceTier === 'dealer' ? 'Dealer net' : 'MSRP only'}
                </p>
              )}
            </div>
            {locked && shareToken && (
              <button
                type="button"
                onClick={duplicateAndEdit}
                className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-muted"
              >
                Duplicate &amp; Edit
              </button>
            )}
          </div>
          <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              placeholder="Search by SKU, collection, finish, bulbs…"
            />
            {highlightNewIntros && (
              <span className="inline-flex items-center rounded-full bg-brand/10 px-4 py-2 text-sm font-medium text-brand">
                Showing new intros only
              </span>
            )}
          </div>
          {locked && shareToken && !shareBannerDismissed && (
            <div className="mt-4 rounded-2xl border border-brand/20 bg-brand/10 px-4 py-3 text-sm text-brand">
              Read-only share view. Duplicate to keep iterating with your team.
              <button
                type="button"
                className="ml-4 text-xs font-semibold underline"
                onClick={() => setShareBannerDismissed(true)}
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-16">
          <RecommendationRow
            title="Recommended from Dallas Market"
            subtitle="Top scanned showstoppers—wholesale and display costs at a glance"
            products={recommended}
            dealer={dealer}
            previouslyPurchased={previouslyPurchasedSkus}
          />
          <RecommendationRow
            title="Previously Purchased Best-Sellers"
            subtitle={dealer ? 'Tailored to your past orders' : 'Popular across dealers'}
            products={previousBest}
            dealer={dealer}
            previouslyPurchased={previouslyPurchasedSkus}
          />
          {collections.map((collection) => (
            <CollectionSection
              key={collection.id}
              collection={collection}
              products={productsByCollection.get(collection.id) ?? []}
              dealer={dealer}
              previouslyPurchased={previouslyPurchasedSkus}
            />
          ))}
        </div>
      </section>
      <div className="lg:col-span-1">
        <SelectionPanel products={products} readOnly={locked} />
      </div>
    </div>
  );
}
