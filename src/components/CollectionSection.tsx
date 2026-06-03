import { Suspense } from 'react';
import { SkuCard } from './SkuCard';
import { SpecComparisonHero } from './SpecComparisonHero';
import type { Collection, DealerProfile, Product } from '@/lib/types';

export type CollectionSectionProps = {
  collection: Collection;
  products: Product[];
  dealer?: DealerProfile | null;
  previouslyPurchased?: string[];
};

export function CollectionSection({
  collection,
  products,
  dealer,
  previouslyPurchased = [],
}: CollectionSectionProps) {
  if (!products.length) return null;

  return (
    <section id={collection.id} className="mt-16 space-y-8">
      {collection.specComparison ? (
        <SpecComparisonHero
          collectionName={collection.name}
          config={collection.specComparison}
        />
      ) : (
        <div className="overflow-hidden rounded-3xl bg-slate-900 text-white shadow-lg">
          {collection.heroVideoUrl ? (
            <div className="aspect-video w-full">
              <video
                src={collection.heroVideoUrl}
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center bg-gradient-to-r from-brand to-brand-muted">
              <p className="text-xl font-semibold">{collection.name}</p>
            </div>
          )}
          <div className="space-y-3 px-6 pb-6 pt-4">
            <h2 className="text-2xl font-semibold">{collection.name}</h2>
            {collection.description && (
              <p className="max-w-3xl text-sm text-slate-200">{collection.description}</p>
            )}
          </div>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <Suspense key={product.sku} fallback={null}>
            <SkuCard
              product={product}
              dealer={dealer}
              isPreviouslyPurchased={previouslyPurchased.includes(product.sku)}
            />
          </Suspense>
        ))}
      </div>
    </section>
  );
}
