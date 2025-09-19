'use client';

import Image from 'next/image';
import { useState } from 'react';
import clsx from 'clsx';
import { useAttributionName } from '@/hooks/useAttribution';
import { useSelectionStore } from '@/hooks/useSelectionStore';
import type { DealerProfile, Product } from '@/lib/types';
import { AttributionPrompt } from './AttributionPrompt';

export type SkuCardProps = {
  product: Product;
  dealer?: DealerProfile | null;
  isPreviouslyPurchased?: boolean;
};

export function SkuCard({ product, dealer, isPreviouslyPurchased }: SkuCardProps) {
  const selection = useSelectionStore((state) => state.selection);
  const addLine = useSelectionStore((state) => state.addLine);
  const toggleFavorite = useSelectionStore((state) => state.toggleFavorite);
  const setCollaborator = useSelectionStore((state) => state.setCollaborator);

  const { name, saveName, ready } = useAttributionName();
  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'add' | 'favorite' | null>(null);
  const [favoriteFeedback, setFavoriteFeedback] = useState<string | null>(null);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  const existingLine = selection?.lines.find((line) => line.sku === product.sku);
  const isAdded = Boolean(existingLine);
  const isFavorited = existingLine?.favorites.includes(name ?? '') ?? false;

  const ensureName = (nextAction: 'add' | 'favorite') => {
    if (name) return true;
    if (!ready) return false;
    setPendingAction(nextAction);
    setPromptOpen(true);
    return false;
  };

  const handleAdd = (actor: string) => {
    if (!selection) return;
    addLine(
      {
        sku: product.sku,
        qty: 1,
        notes: existingLine?.notes,
        pickedBy: existingLine?.pickedBy ?? [],
        favorites: existingLine?.favorites ?? [],
        collectionId: product.collectionId,
      },
      actor
    );
    setCollaborator(actor);
    setAddFeedback(
      isPreviouslyPurchased
        ? 'You’ve carried this before—great refresh option.'
        : product.isNewIntro
          ? 'Nice pick—new intros love a storytelling moment nearby.'
          : 'Added to your selection.'
    );
  };

  const handleFavorite = (actor: string) => {
    if (!selection) return;
    const result = toggleFavorite(product.sku, actor, product.collectionId);
    if (result.status === 'denied') {
      setFavoriteFeedback('Max favorites reached in this collection.');
      return;
    }
    if (result.status === 'added') {
      setFavoriteFeedback(
        result.remaining > 0
          ? `Starred! ${result.remaining} favorite${result.remaining === 1 ? '' : 's'} left in this collection.`
          : 'Starred! You’ve used all favorites here.'
      );
    } else {
      setFavoriteFeedback('Removed from your favorites.');
    }
  };

  const onAddClick = () => {
    if (!ensureName('add')) return;
    handleAdd(name!);
  };

  const onFavoriteClick = () => {
    if (!ensureName('favorite')) return;
    handleFavorite(name!);
  };

  const priceLabel = (() => {
    if (dealer?.priceTier === 'dealer' && product.price.dealerNet) {
      return `$${product.price.dealerNet.toLocaleString()} dealer net`;
    }
    return `$${product.price.msrp.toLocaleString()} MSRP`;
  })();

  const displayBadge = dealer?.displays.some((item) => item.sku === product.sku);

  return (
    <div className="group flex h-full flex-col justify-between rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg">
      <div>
        <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
          <Image
            src={product.images[0]}
            alt={`${product.title} ${product.sku}`}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 320px"
          />
        </div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              {product.vendor}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{product.title}</h3>
            <p className="text-sm text-slate-500">SKU {product.sku}</p>
          </div>
          <div className="text-right text-sm font-semibold text-brand">{priceLabel}</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {product.isNewIntro && (
            <Badge variant="brand">New Intro</Badge>
          )}
          {product.isMarketRecommended && (
            <Badge variant="accent">Dallas Recommended</Badge>
          )}
          {isPreviouslyPurchased && <Badge variant="success">Previously purchased</Badge>}
          {displayBadge && <Badge variant="neutral">On display</Badge>}
          {isAdded && <Badge variant="outline">✓ Added</Badge>}
        </div>
        <ul className="mt-4 space-y-1 text-sm text-slate-600">
          {Object.entries(product.specs)
            .slice(0, 4)
            .map(([key, value]) => (
              <li key={key} className="flex justify-between gap-4">
                <span className="font-medium text-slate-500">{key}</span>
                <span className="text-right text-slate-700">{String(value)}</span>
              </li>
            ))}
        </ul>
      </div>
      <div className="mt-6 space-y-2">
        <button
          type="button"
          onClick={onAddClick}
          className={clsx(
            'flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
            isAdded
              ? 'bg-brand/10 text-brand'
              : 'bg-brand text-white shadow-sm hover:bg-brand-muted'
          )}
        >
          {isAdded ? '✓ Added' : 'Add to Selection'}
        </button>
        <button
          type="button"
          onClick={onFavoriteClick}
          className={clsx(
            'flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
            isFavorited
              ? 'border-brand/40 bg-brand/10 text-brand'
              : 'border-slate-200 bg-white text-slate-600 hover:border-brand/40 hover:text-brand'
          )}
        >
          {isFavorited ? '★ Favorited' : '☆ Favorite'}
        </button>
        {(favoriteFeedback || addFeedback) && (
          <p className="text-xs text-slate-500">
            {favoriteFeedback ?? addFeedback}
          </p>
        )}
      </div>
      <AttributionPrompt
        open={promptOpen}
        defaultValue={name}
        onClose={() => {
          setPromptOpen(false);
          setPendingAction(null);
        }}
        onSubmit={(newName) => {
          saveName(newName);
          if (!selection) return;
          if (pendingAction === 'add') {
            handleAdd(newName);
          } else if (pendingAction === 'favorite') {
            handleFavorite(newName);
          }
          setPendingAction(null);
        }}
      />
    </div>
  );
}

type BadgeProps = {
  children: React.ReactNode;
  variant?: 'brand' | 'accent' | 'success' | 'outline' | 'neutral';
};

function Badge({ children, variant = 'brand' }: BadgeProps) {
  const classes = {
    brand: 'bg-brand/10 text-brand',
    accent: 'bg-brand-accent/10 text-brand-accent',
    success: 'bg-emerald-100 text-emerald-700',
    outline: 'border border-brand/40 text-brand',
    neutral: 'bg-slate-100 text-slate-600',
  }[variant];
  return (
    <span className={clsx('rounded-full px-3 py-1 text-xs font-semibold', classes)}>
      {children}
    </span>
  );
}
