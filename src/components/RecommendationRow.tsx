import type { DealerProfile, Product } from '@/lib/types';
import { SkuCard } from './SkuCard';

export type RecommendationRowProps = {
  title: string;
  subtitle?: string;
  products: Product[];
  dealer?: DealerProfile | null;
  previouslyPurchased?: string[];
};

export function RecommendationRow({
  title,
  subtitle,
  products,
  dealer,
  previouslyPurchased = [],
}: RecommendationRowProps) {
  if (!products.length) return null;
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <SkuCard
            key={product.sku}
            product={product}
            dealer={dealer}
            isPreviouslyPurchased={previouslyPurchased.includes(product.sku)}
            variant="thumb"
            tileShape="landscape"
          />
        ))}
      </div>
    </section>
  );
}
