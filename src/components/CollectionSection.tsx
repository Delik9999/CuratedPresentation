import { Suspense } from 'react';
import { SkuCard } from './SkuCard';
import type { Collection, DealerProfile, Product } from '@/lib/types';

const VIDEO_FILE_REGEX = /\.(mp4|mov)$/i;

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

  const primaryHero = collection.heroVideoUrl ?? collection.fallbackHeroVideoUrl;
  const fallbackHero =
    collection.heroVideoUrl && collection.fallbackHeroVideoUrl
      ? collection.fallbackHeroVideoUrl
      : undefined;
  const heroIsFile = Boolean(collection.heroVideoUrl && VIDEO_FILE_REGEX.test(collection.heroVideoUrl));
  const fallbackIsFile = Boolean(fallbackHero && VIDEO_FILE_REGEX.test(fallbackHero));

  const isCalcolo = collection.id === 'calcolo';
  const calcoloGroups = isCalcolo
    ? buildCalcoloGroups(products, previouslyPurchased)
    : [];

  return (
    <section id={collection.id} className="mt-16 space-y-8">
      <div className="overflow-hidden rounded-3xl bg-slate-900 text-white shadow-lg">
        {primaryHero ? (
          <div className="aspect-video w-full">
            {heroIsFile ? (
              <video
                src={collection.heroVideoUrl!}
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : fallbackIsFile ? (
              <video
                src={fallbackHero!}
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              <video
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              >
                <source src={primaryHero} />
                {fallbackHero && <source src={fallbackHero} />}
              </video>
            )}
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
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {isCalcolo
          ? calcoloGroups.map((group) => (
              <Suspense key={group.id} fallback={null}>
                <SkuCard
                  product={group.defaultProduct}
                  dealer={dealer}
                  variant="thumb"
                  previouslyPurchasedSkus={group.previouslyPurchasedSkus}
                  variantGroup={{
                    baseTitle: group.baseTitle,
                    variants: group.variants.map((variant) => ({
                      product: variant.product,
                      finish: variant.finish,
                      isDefault: variant.isDefault,
                    })),
                  }}
                />
              </Suspense>
            ))
          : products.map((product) => (
              <Suspense key={product.sku} fallback={null}>
                <SkuCard
                  product={product}
                  dealer={dealer}
                  isPreviouslyPurchased={previouslyPurchased.includes(product.sku)}
                  variant="thumb"
                />
              </Suspense>
            ))}
      </div>
    </section>
  );
}

type CalcoloVariant = {
  product: Product;
  finish: string;
  isDefault: boolean;
};

type CalcoloGroup = {
  id: string;
  baseTitle: string;
  defaultProduct: Product;
  variants: CalcoloVariant[];
  previouslyPurchasedSkus: string[];
  sortKey: string;
};

function buildCalcoloGroups(products: Product[], previouslyPurchased: string[]): CalcoloGroup[] {
  const sorted = [...products].sort((a, b) => a.sku.localeCompare(b.sku));
  const previouslyPurchasedSet = new Set(previouslyPurchased);
  const groups = new Map<string, CalcoloGroup>();

  sorted.forEach((product, index) => {
    const finish = getFinish(product);
    const { groupKey, baseTitle } = deriveCalcoloGrouping(product, finish);
    const sortKey = `${index.toString().padStart(4, '0')}-${product.sku}`;
    const existing = groups.get(groupKey);

    if (!existing) {
      const variant: CalcoloVariant = {
        product,
        finish,
        isDefault: true,
      };
      groups.set(groupKey, {
        id: `${groupKey}-${product.sku}`,
        baseTitle,
        defaultProduct: product,
        variants: [variant],
        previouslyPurchasedSkus: previouslyPurchasedSet.has(product.sku) ? [product.sku] : [],
        sortKey,
      });
      return;
    }

    const variant: CalcoloVariant = {
      product,
      finish,
      isDefault: false,
    };
    existing.variants.push(variant);
    if (previouslyPurchasedSet.has(product.sku)) {
      existing.previouslyPurchasedSkus.push(product.sku);
    }
  });

  return Array.from(groups.values())
    .map((group) => {
      if (!group.variants.some((variant) => variant.isDefault)) {
        group.variants[0].isDefault = true;
        group.defaultProduct = group.variants[0].product;
      }
      const defaultVariant = group.variants.find((variant) => variant.isDefault) ?? group.variants[0];
      return {
        ...group,
        defaultProduct: defaultVariant.product,
        variants: group.variants,
        previouslyPurchasedSkus: Array.from(new Set(group.previouslyPurchasedSkus)),
      };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

function deriveCalcoloGrouping(product: Product, finish: string) {
  const skuRoot = product.sku.split('-')[0] ?? product.sku;
  const stripped = stripFinishFromTitle(product.title, finish);
  const baseTitle = stripped || skuRoot;
  const groupKey = baseTitle.toLowerCase();
  return {
    groupKey: groupKey || skuRoot.toLowerCase(),
    baseTitle,
  };
}

function stripFinishFromTitle(title: string, finish: string) {
  let cleaned = title ?? '';
  if (finish) {
    const escapedFinish = escapeRegExp(finish);
    const trailingFinish = new RegExp(`,\s*${escapedFinish}$`, 'i');
    cleaned = cleaned.replace(trailingFinish, '');
  }
  cleaned = cleaned.replace(/,\s*/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned;
}

function getFinish(product: Product): string {
  const finish = product.specs?.Finish ?? product.specs?.['Finish'];
  return typeof finish === 'string' ? finish : '';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
