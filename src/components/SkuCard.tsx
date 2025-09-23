'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { useAttributionName } from '@/hooks/useAttribution';
import { useSelectionStore } from '@/hooks/useSelectionStore';
import { describeAvailability } from '@/lib/availability';
import type { DealerProfile, Product } from '@/lib/types';
import { AttributionPrompt } from './AttributionPrompt';

export type SkuVariantGroup = {
  baseTitle: string;
  variants: Array<{
    product: Product;
    finish: string;
    isDefault?: boolean;
  }>;
};

export type SkuCardProps = {
  product: Product;
  dealer?: DealerProfile | null;
  isPreviouslyPurchased?: boolean;
  variant?: 'thumb' | 'detail';
  tileShape?: 'square' | 'landscape';
  variantGroup?: SkuVariantGroup;
  previouslyPurchasedSkus?: string[];
};

export function SkuCard({
  product,
  dealer,
  isPreviouslyPurchased,
  variant = 'thumb',
  tileShape = 'square',
  variantGroup,
  previouslyPurchasedSkus,
}: SkuCardProps) {
  const selection = useSelectionStore((state) => state.selection);
  const addLine = useSelectionStore((state) => state.addLine);
  const toggleFavorite = useSelectionStore((state) => state.toggleFavorite);
  const setCollaborator = useSelectionStore((state) => state.setCollaborator);

  const { name, saveName, ready } = useAttributionName();
  const [promptOpen, setPromptOpen] = useState(false);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [pendingAction, setPendingAction] = useState<'add' | 'favorite' | null>(null);
  const [favoriteFeedback, setFavoriteFeedback] = useState<string | null>(null);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);
  const [hoverSku, setHoverSku] = useState<string | null>(null);

  const variantEntries = useMemo(() => {
    if (!variantGroup) return null;
    const map = new Map<string, SkuVariantGroup['variants'][number]>();
    variantGroup.variants.forEach((variantOption) => {
      map.set(variantOption.product.sku, variantOption);
    });
    return map;
  }, [variantGroup]);

  const defaultSku = useMemo(() => {
    if (!variantGroup) return product.sku;
    const defaultVariant = variantGroup.variants.find((variantOption) => variantOption.isDefault);
    return (
      defaultVariant?.product.sku ??
      variantGroup.variants[0]?.product.sku ??
      product.sku
    );
  }, [variantGroup, product.sku]);

  const [activeSku, setActiveSku] = useState(defaultSku);

  useEffect(() => {
    setActiveSku(defaultSku);
  }, [defaultSku]);

  useEffect(() => {
    setHoverSku(null);
  }, [variantGroup]);

  useEffect(() => {
    setFavoriteFeedback(null);
    setAddFeedback(null);
  }, [activeSku]);

  useEffect(() => {
    if (modalProduct) {
      setFavoriteFeedback(null);
      setAddFeedback(null);
    }
  }, [modalProduct]);

  const resolveVariantProduct = (sku: string | null | undefined) => {
    if (!sku) return undefined;
    return variantEntries?.get(sku)?.product;
  };

  const activeProduct = variantGroup ? resolveVariantProduct(activeSku) ?? product : product;
  const displayProduct = variantGroup
    ? resolveVariantProduct(hoverSku) ?? activeProduct
    : activeProduct;
  const selectionProduct = modalProduct ?? activeProduct;

  const previouslyPurchasedSet = useMemo(() => {
    if (previouslyPurchasedSkus?.length) {
      return new Set(previouslyPurchasedSkus);
    }
    if (isPreviouslyPurchased) {
      return new Set([product.sku]);
    }
    return new Set<string>();
  }, [previouslyPurchasedSkus, isPreviouslyPurchased, product.sku]);

  const activePreviouslyPurchased = previouslyPurchasedSet.has(activeProduct.sku);
  const selectionPreviouslyPurchased = previouslyPurchasedSet.has(selectionProduct.sku);

  const selectionLine = selection?.lines.find((line) => line.sku === selectionProduct.sku);
  const isAdded = Boolean(selectionLine);
  const isFavorited = selectionLine?.favorites.includes(name ?? '') ?? false;
  const activeDisplayBadge = dealer?.displays.some((item) => item.sku === activeProduct.sku);
  const selectionDisplayBadge = dealer?.displays.some((item) => item.sku === selectionProduct.sku);

  const activeAvailabilityInfo = describeAvailability(activeProduct.availability);
  const selectionAvailabilityInfo = describeAvailability(selectionProduct.availability);

  const getPricing = (target: Product) => {
    const hasDealerWholesale = Boolean(dealer?.priceTier === 'dealer' && target.price.dealerNet);
    const primaryValue = hasDealerWholesale ? target.price.dealerNet! : target.price.msrp;
    const primaryLabel = hasDealerWholesale ? 'Wholesale' : 'Retail';
    const displayCostLabel = target.price.displayCost
      ? `$${target.price.displayCost.toLocaleString()}`
      : null;
    return {
      primaryLabel,
      primaryDisplay: `$${primaryValue.toLocaleString()}`,
      displayCostLabel,
    };
  };

  const activePricing = getPricing(activeProduct);
  const selectionPricing = getPricing(selectionProduct);

  const tileTitle = variantGroup?.baseTitle ?? displayProduct.title;
  const fallbackTileSrc = `https://libandco.com/cdn/shop/files/${displayProduct.sku}.jpg`;
  const tileImgSrc = displayProduct.images?.[0] ?? fallbackTileSrc;
  const fallbackModalSrc = `https://libandco.com/cdn/shop/files/${selectionProduct.sku}.jpg`;
  const modalImgSrc = selectionProduct.images?.[0] ?? fallbackModalSrc;

  const modalReferenceSku = modalProduct?.sku ?? activeProduct.sku;
  const modalTitleId = useMemo(
    () => `product-${modalReferenceSku.replace(/[^a-zA-Z0-9]/g, '')}-title`,
    [modalReferenceSku]
  );

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
        sku: selectionProduct.sku,
        qty: 1,
        notes: selectionLine?.notes,
        pickedBy: selectionLine?.pickedBy ?? [],
        favorites: selectionLine?.favorites ?? [],
        collectionId: selectionProduct.collectionId,
      },
      actor
    );
    setCollaborator(actor);
    setAddFeedback(
      selectionPreviouslyPurchased
        ? 'You’ve carried this before—great refresh option.'
        : selectionProduct.isNewIntro
          ? 'Nice pick—new intros love a storytelling moment nearby.'
          : 'Added to your selection.'
    );
  };

  const handleFavorite = (actor: string) => {
    if (!selection) return;
    if (!selectionLine) {
      setFavoriteFeedback('Add this piece to your selection before favoriting.');
      return;
    }
    const result = toggleFavorite(selectionProduct.sku, actor, selectionProduct.collectionId);
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

  const isThumb = variant === 'thumb';

  const cardClasses = isThumb
    ? clsx(
        'group relative w-full overflow-hidden rounded-2xl text-left shadow-sm ring-1 ring-slate-200 transition cursor-pointer',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60'
      )
    : clsx(
        'group relative flex w-full flex-col gap-3 text-left transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
        'rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200 hover:-translate-y-1 hover:shadow-lg'
      );

  const imageWrapperClasses = isThumb
    ? clsx(
        'relative bg-slate-100',
        tileShape === 'landscape' ? 'aspect-[4/3]' : 'aspect-square'
      )
    : 'relative overflow-hidden rounded-2xl bg-slate-100 aspect-square';

  const handleCardActivate = () => {
    setModalProduct(activeProduct);
    setHoverSku(null);
  };

  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardActivate();
    }
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleCardActivate}
        onKeyDown={handleCardKeyDown}
        className={cardClasses}
        aria-label={tileTitle}
      >
        <div className={imageWrapperClasses}>
          <Image
            src={tileImgSrc}
            alt={tileTitle}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 90vw, 320px"
          />
          {isThumb ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pb-2 pt-8">
              <h3 className="text-sm font-semibold text-white line-clamp-2">{tileTitle}</h3>
            </div>
          ) : (
            isAdded && (
              <span className="absolute left-3 top-3 rounded-full bg-brand text-xs font-semibold uppercase tracking-wide text-white shadow">
                &nbsp;✓ Added&nbsp;
              </span>
            )
          )}
        </div>
        {variantGroup && (
          <div className="flex flex-wrap gap-2 px-3 pb-3 pt-2">
            {variantGroup.variants.map((variantOption) => {
              const variantSku = variantOption.product.sku;
              const isActiveVariant = variantSku === activeSku;
              return (
                <button
                  key={variantSku}
                  type="button"
                  className={clsx(
                    'h-6 w-6 rounded-full ring-1 ring-slate-300 transition',
                    isActiveVariant
                      ? 'ring-2 ring-brand ring-offset-2 ring-offset-slate-900/40'
                      : 'hover:ring-2 hover:ring-brand/60'
                  )}
                  style={{ backgroundColor: mapFinishToColor(variantOption.finish) }}
                  aria-label={variantOption.finish || `Finish ${variantSku}`}
                  aria-pressed={isActiveVariant}
                  onMouseEnter={() => setHoverSku(variantSku)}
                  onMouseLeave={() => setHoverSku(null)}
                  onBlur={() => setHoverSku(null)}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveSku(variantSku);
                  }}
                />
              );
            })}
          </div>
        )}
        {!isThumb && (
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900">{activeProduct.title}</h3>
              <p className="text-sm text-slate-500">{activeProduct.vendor}</p>
              {activeAvailabilityInfo && (
                <p className={clsx('text-xs font-semibold', activeAvailabilityInfo.toneClass)}>
                  {activeAvailabilityInfo.label}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end text-right text-sm font-semibold text-slate-900">
              <span className="text-sm font-semibold text-slate-900">{activePricing.primaryDisplay}</span>
              {activeAvailabilityInfo && (
                <span className={clsx('text-xs font-semibold', activeAvailabilityInfo.toneClass)}>
                  {activeAvailabilityInfo.label}
                </span>
              )}
              {activeAvailabilityInfo?.asOfLabel && (
                <span className="text-[11px] text-slate-400">{activeAvailabilityInfo.asOfLabel}</span>
              )}
            </div>
          </div>
        )}
      </div>

      <ProductOverlay
        open={Boolean(modalProduct)}
        onClose={() => {
          setModalProduct(null);
          setHoverSku(null);
        }}
        labelledBy={modalTitleId}
      >
        {modalProduct && (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-slate-100 md:aspect-[4/5]">
              <Image
                src={modalImgSrc}
                alt={selectionProduct.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 90vw, 480px"
              />
            </div>
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{selectionProduct.vendor}</p>
                <h2 id={modalTitleId} className="mt-1 text-3xl font-semibold text-slate-900">
                  {selectionProduct.title}
                </h2>
                <p className="mt-2 text-sm text-slate-500">SKU {selectionProduct.sku}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <PriceTile label={selectionPricing.primaryLabel} value={selectionPricing.primaryDisplay} />
                {selectionPricing.displayCostLabel && (
                  <PriceTile label="Display cost" value={selectionPricing.displayCostLabel} />
                )}
                {selectionAvailabilityInfo && (
                  <PriceTile
                    label="Availability"
                    value={selectionAvailabilityInfo.label}
                    toneClass={selectionAvailabilityInfo.toneClass}
                    description={selectionAvailabilityInfo.asOfLabel}
                  />
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                {selectionProduct.isNewIntro && <Badge variant="brand">New intro</Badge>}
                {selectionProduct.isMarketRecommended && <Badge variant="accent">Dallas recommended</Badge>}
                {selectionPreviouslyPurchased && <Badge variant="success">Previously purchased</Badge>}
                {selectionDisplayBadge && <Badge variant="neutral">On display</Badge>}
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Details</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {Object.entries(selectionProduct.specs).map(([key, value]) => (
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
              {selectionPreviouslyPurchased && (
                <p className="text-xs text-slate-500">
                  You’ve carried this before—perfect for a refreshed vignette.
                </p>
              )}
            </div>
          </div>
        )}
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

function mapFinishToColor(name: string): string {
  const normalized = name?.toLowerCase() ?? '';
  if (!normalized) return '#CBD5E1';
  if (normalized.includes('soft brass') || normalized.includes('brushed brass')) return '#C3A257';
  if (normalized.includes('antique') || normalized.includes('bronze')) return '#7A5A3A';
  if (normalized.includes('graphite') || normalized.includes('matte black') || normalized.includes('black'))
    return '#2E2E2E';
  if (normalized.includes('white')) return '#E9ECEF';
  if (normalized.includes('nickel') || normalized.includes('chrome') || normalized.includes('steel'))
    return '#C8CDD3';
  return '#CBD5E1';
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
  toneClass?: string;
  description?: string;
};

function PriceTile({ label, value, toneClass, description }: PriceTileProps) {
  return (
    <div className="rounded-2xl bg-slate-100 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={clsx('mt-1 text-base font-semibold text-slate-900', toneClass)}>{value}</p>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
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

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <div
            role="presentation"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full cursor-pointer"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            className="relative z-[61] max-h-full w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-5 top-5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-500 transition hover:bg-slate-200"
            >
              Close
            </button>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
