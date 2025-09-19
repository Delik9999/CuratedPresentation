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
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <SkuCard
            key={product.sku}
            product={product}
            dealer={dealer}
            isPreviouslyPurchased={previouslyPurchased.includes(product.sku)}
          />
        ))}
      </div>
    </section>
  );
}
