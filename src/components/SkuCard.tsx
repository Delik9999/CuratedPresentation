'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useAttributionName } from '@/hooks/useAttribution';
import { useSelectionStore } from '@/hooks/useSelectionStore';
import type { DealerProfile, Product } from '@/lib/types';
import { AttributionPrompt } from './AttributionPrompt';

export type SkuCardProps = {
  product: Product;
  dealer?: DealerProfile | null;
  isPreviouslyPurchased?: boolean;
  variant?: 'gallery' | 'recommendation';
};

export function SkuCard({
  product,
  dealer,
  isPreviouslyPurchased,
  variant = 'gallery',
}: SkuCardProps) {
  const selection = useSelectionStore((state) => state.selection);
  const addLine = useSelectionStore((state) => state.addLine);
  const toggleFavorite = useSelectionStore((state) => state.toggleFavorite);
  const setCollaborator = useSelectionStore((state) => state.setCollaborator);

  const { name, saveName, ready } = useAttributionName();
  const [promptOpen, setPromptOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'add' | 'favorite' | null>(null);
  const [favoriteFeedback, setFavoriteFeedback] = useState<string | null>(null);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  const existingLine = selection?.lines.find((line) => line.sku === product.sku);
  const isAdded = Boolean(existingLine);
  const isFavorited = existingLine?.favorites.includes(name ?? '') ?? false;
  const displayBadge = dealer?.displays.some((item) => item.sku === product.sku);

  const modalTitleId = useMemo(
    () => `product-${product.sku.replace(/[^a-zA-Z0-9]/g, '')}-title`,
    [product.sku]
  );

  useEffect(() => {
    if (modalOpen) {
      setFavoriteFeedback(null);
      setAddFeedback(null);
    }
  }, [modalOpen]);

  const hasDealerWholesale = Boolean(dealer?.priceTier === 'dealer' && product.price.dealerNet);
  const primaryPriceValue = hasDealerWholesale
    ? product.price.dealerNet!
    : product.price.msrp;
  const primaryPriceLabel = hasDealerWholesale ? 'Wholesale' : 'MSRP';
  const primaryPriceDisplay = `$${primaryPriceValue.toLocaleString()}`;
  const msrpLabel = `$${product.price.msrp.toLocaleString()}`;
  const displayCostLabel = product.price.displayCost
    ? `$${product.price.displayCost.toLocaleString()}`
    : null;

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
    if (!existingLine) {
      setFavoriteFeedback('Add this piece to your selection before favoriting.');
      return;
    }
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

  const cardClasses = clsx(
    'group relative flex w-full flex-col gap-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
    variant === 'gallery'
      ? 'rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200 hover:-translate-y-1 hover:shadow-lg'
      : 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md'
  );

  const imageWrapperClasses = clsx(
    'relative overflow-hidden rounded-2xl bg-slate-100',
    variant === 'gallery' ? 'aspect-square' : 'aspect-[4/3]'
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={cardClasses}
      >
        <div className={imageWrapperClasses}>
          <Image
            src={product.images[0]}
            alt={`${product.title}`}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 90vw, 320px"
          />
          {isAdded && (
            <span className="absolute left-3 top-3 rounded-full bg-brand text-xs font-semibold uppercase tracking-wide text-white shadow">
              &nbsp;✓ Added&nbsp;
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900">{product.title}</h3>
            {variant === 'recommendation' ? (
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Dallas Market Highlight
              </p>
            ) : (
              <p className="text-sm text-slate-500">{product.vendor}</p>
            )}
          </div>
          <div className="text-right text-sm font-semibold text-slate-900">
            {variant === 'recommendation' ? (
              <div className="flex flex-col items-end text-xs text-slate-500">
                <span className="text-[11px] uppercase tracking-widest text-slate-400">{primaryPriceLabel}</span>
                <span className="text-sm font-semibold text-slate-900">{primaryPriceDisplay}</span>
                {displayCostLabel && <span>Display {displayCostLabel}</span>}
              </div>
            ) : (
              <span className="text-sm font-semibold text-slate-900">{primaryPriceDisplay}</span>
            )}
          </div>
        </div>
      </button>

      <ProductOverlay
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        labelledBy={modalTitleId}
      >
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-slate-100 md:aspect-[4/5]">
            <Image
              src={product.images[0]}
              alt={`${product.title}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 90vw, 480px"
            />
          </div>
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{product.vendor}</p>
              <h2 id={modalTitleId} className="mt-1 text-3xl font-semibold text-slate-900">
                {product.title}
              </h2>
              <p className="mt-2 text-sm text-slate-500">SKU {product.sku}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <PriceTile label={primaryPriceLabel} value={primaryPriceDisplay} />
              {displayCostLabel && <PriceTile label="Display cost" value={displayCostLabel} />}
              {hasDealerWholesale && <PriceTile label="MSRP" value={msrpLabel} />}
              {product.price.map && (
                <PriceTile label="MAP" value={`$${product.price.map.toLocaleString()}`} />
              )}
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
              {product.isNewIntro && <Badge variant="brand">New intro</Badge>}
              {product.isMarketRecommended && <Badge variant="accent">Dallas recommended</Badge>}
              {isPreviouslyPurchased && <Badge variant="success">Previously purchased</Badge>}
              {displayBadge && <Badge variant="neutral">On display</Badge>}
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Details</h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {Object.entries(product.specs).map(([key, value]) => (
                  <li key={key} className="flex items-center justify-between gap-6">
                    <span className="text-slate-500">{key}</span>
                    <span className="text-right text-slate-800">{String(value)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onAddClick}
                className={clsx(
                  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition',
                  isAdded ? 'bg-brand/10 text-brand' : 'bg-brand text-white hover:bg-brand-muted'
                )}
              >
                {isAdded ? '✓ Added' : 'Add to Selection'}
              </button>
              <button
                type="button"
                onClick={onFavoriteClick}
                className={clsx(
                  'inline-flex items-center justify-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold transition',
                  isFavorited
                    ? 'border-brand/40 bg-brand/10 text-brand'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-brand/40 hover:text-brand'
                )}
              >
                {isFavorited ? '★ Favorited' : '☆ Favorite'}
              </button>
            </div>
            {(favoriteFeedback || addFeedback) && (
              <p className="text-xs text-slate-500">{favoriteFeedback ?? addFeedback}</p>
            )}
            {isPreviouslyPurchased && (
              <p className="text-xs text-slate-500">
                You’ve carried this before—perfect for a refreshed vignette.
              </p>
            )}
          </div>
        </div>
      </ProductOverlay>

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
    </>
  );
}

type BadgeProps = {
  children: React.ReactNode;
  variant?: 'brand' | 'accent' | 'success' | 'neutral';
};

function Badge({ children, variant = 'brand' }: BadgeProps) {
  const classes = {
    brand: 'bg-brand/10 text-brand',
    accent: 'bg-brand-accent/10 text-brand-accent',
    success: 'bg-emerald-100 text-emerald-700',
    neutral: 'bg-slate-200 text-slate-700',
  }[variant];
  return (
    <span className={clsx('rounded-full px-3 py-1', classes)}>{children}</span>
  );
}

type PriceTileProps = {
  label: string;
  value: string;
};

function PriceTile({ label, value }: PriceTileProps) {
  return (
    <div className="rounded-2xl bg-slate-100 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

type ProductOverlayProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy: string;
};

function ProductOverlay({ open, onClose, children, labelledBy }: ProductOverlayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !mounted) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose, mounted]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-8">
      <div
        role="presentation"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full cursor-pointer"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative z-[61] max-h-full w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500 transition hover:bg-slate-200"
        >
          Close
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
