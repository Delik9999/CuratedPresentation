'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { useAttributionName } from '@/hooks/useAttribution';
import { useSelectionStore } from '@/hooks/useSelectionStore';
import type { Product } from '@/lib/types';
import { AttributionPrompt } from './AttributionPrompt';
import { ExportMenu } from './ExportMenu';
import { ShareDialog } from './ShareDialog';

export type SelectionPanelProps = {
  products: Product[];
  readOnly?: boolean;
};

export function SelectionPanel({ products, readOnly = false }: SelectionPanelProps) {
  const selection = useSelectionStore((state) => state.selection);
  const collaborators = useSelectionStore((state) => state.collaborators);
  const updateQty = useSelectionStore((state) => state.updateQty);
  const updateNotes = useSelectionStore((state) => state.updateNotes);
  const removeLine = useSelectionStore((state) => state.removeLine);
  const clear = useSelectionStore((state) => state.clear);
  const replaceSelection = useSelectionStore((state) => state.replaceSelection);
  const setCollaborator = useSelectionStore((state) => state.setCollaborator);

  const { name, saveName, ready } = useAttributionName();
  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | ((resolvedName: string) => void)>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'selection' | 'leaderboard'>('selection');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [mobileOpen, setMobileOpen] = useState(false);

  const skuMap = useMemo(() => new Map(products.map((product) => [product.sku, product])), [products]);

  const lines = selection?.lines ?? [];
  const totalItems = lines.reduce((sum, line) => sum + line.qty, 0);

  const leaderboard = useMemo(() => {
    return [...lines]
      .map((line) => ({
        sku: line.sku,
        favorites: line.favorites.length,
        title: skuMap.get(line.sku)?.title ?? line.sku,
      }))
      .filter((item) => item.favorites > 0)
      .sort((a, b) => b.favorites - a.favorites);
  }, [lines, skuMap]);

  const newIntroCount = useMemo(
    () => lines.filter((line) => skuMap.get(line.sku)?.isNewIntro).length,
    [lines, skuMap]
  );

  const storytellingCollection = useMemo(() => {
    const introLine = lines.find((line) => skuMap.get(line.sku)?.isNewIntro);
    if (!introLine) return null;
    const product = skuMap.get(introLine.sku);
    return (
      product?.specs['Collection name'] ?? product?.collectionId ?? 'this collection'
    );
  }, [lines, skuMap]);

  const ensureName = (action: (resolvedName: string) => void) => {
    if (readOnly) {
      action(name ?? '');
      return;
    }
    if (name) {
      action(name);
    } else if (ready) {
      setPendingAction(() => action);
      setPromptOpen(true);
    }
  };

  const handleQtyChange = (sku: string, qty: number) => {
    if (!selection || readOnly) return;
    ensureName((actor) => {
      updateQty(sku, qty);
      setCollaborator(actor);
    });
  };

  const handleNotesChange = (sku: string, notes: string) => {
    if (!selection || readOnly) return;
    ensureName((actor) => {
      updateNotes(sku, notes);
      setCollaborator(actor);
    });
  };

  const handleRemove = (sku: string) => {
    if (readOnly) return;
    ensureName(() => removeLine(sku));
  };

  const handleClear = () => {
    if (readOnly) return;
    ensureName(() => clear());
  };

  const handleSave = async () => {
    if (!selection || readOnly) return;
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selection),
      });
      if (!response.ok) throw new Error('Save failed');
      const json = await response.json();
      replaceSelection(json.selection);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  const panelContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {selection?.name ?? 'Dallas Market Selection'}
          </h2>
          <p className="text-xs text-slate-500">
            {lines.length} SKU{lines.length === 1 ? '' : 's'} · {totalItems} item{totalItems === 1 ? '' : 's'}
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-semibold text-rose-500 hover:text-rose-600"
          >
            Clear
          </button>
        )}
      </div>

      {newIntroCount >= 5 && storytellingCollection && (
        <p className="mt-3 rounded-2xl bg-brand/10 px-4 py-3 text-xs font-medium text-brand">
          Nice picks—dealers often pair these with a storytelling piece from {storytellingCollection}. Want a suggestion?
        </p>
      )}

      <div className="mt-4 flex space-x-2 rounded-full bg-slate-100 p-1 text-sm font-semibold text-slate-500">
        <button
          type="button"
          className={clsx('flex-1 rounded-full px-3 py-2', activeTab === 'selection' && 'bg-white text-slate-900 shadow')}
          onClick={() => setActiveTab('selection')}
        >
          Selection
        </button>
        <button
          type="button"
          className={clsx('flex-1 rounded-full px-3 py-2', activeTab === 'leaderboard' && 'bg-white text-slate-900 shadow')}
          onClick={() => setActiveTab('leaderboard')}
        >
          Leaderboard
        </button>
      </div>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1 text-sm">
        {activeTab === 'selection' ? (
          lines.length === 0 ? (
            <p className="rounded-2xl bg-slate-100 p-6 text-center text-slate-500">
              Nothing selected yet. Tap a SKU to get started.
            </p>
          ) : (
            lines.map((line) => {
              const product = skuMap.get(line.sku);
              const collectionLabel = product?.specs['Collection name'] ?? product?.collectionId ?? 'Collection';
              return (
                <div
                  key={line.sku}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        {collectionLabel}
                      </p>
                      <h3 className="text-base font-semibold text-slate-900">
                        {product?.title ?? line.sku}
                      </h3>
                      <p className="text-xs text-slate-500">SKU {line.sku}</p>
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => handleRemove(line.sku)}
                        className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-sm">
                    <label className="text-slate-500">Qty</label>
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1">
                      <button
                        type="button"
                        onClick={() => handleQtyChange(line.sku, Math.max(1, line.qty - 1))}
                        className="h-6 w-6 rounded-full bg-slate-100 text-center text-base font-semibold text-slate-600"
                        disabled={readOnly}
                      >
                        −
                      </button>
                      <span className="min-w-[2ch] text-center font-semibold text-slate-700">{line.qty}</span>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(line.sku, line.qty + 1)}
                        className="h-6 w-6 rounded-full bg-brand/10 text-center text-base font-semibold text-brand"
                        disabled={readOnly}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Notes
                    </label>
                    <textarea
                      value={line.notes ?? ''}
                      onChange={(event) => handleNotesChange(line.sku, event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                      rows={3}
                      placeholder="Add context for the buyer…"
                      disabled={readOnly}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-600">Picked by:</span>
                    {line.pickedBy.length === 0 ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1">Unclaimed</span>
                    ) : (
                      line.pickedBy.map((person) => (
                        <span key={person} className="rounded-full bg-brand/10 px-2 py-1 text-brand">
                          {person}
                        </span>
                      ))
                    )}
                    {line.favorites.length > 0 && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-amber-700">
                        ★ {line.favorites.length}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )
        ) : (
          <div className="space-y-3">
            {leaderboard.length === 0 ? (
              <p className="rounded-2xl bg-slate-100 p-6 text-center text-slate-500">
                Favorites will appear here once your team stars a few showstoppers.
              </p>
            ) : (
              leaderboard.map((item, index) => (
                <div
                  key={item.sku}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-400">#{index + 1}</p>
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">SKU {item.sku}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
                    ★ {item.favorites}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            disabled={lines.length === 0}
            className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:text-slate-300"
          >
            Share
          </button>
          <ExportMenu selectionId={selection?.id} disabled={lines.length === 0} />
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => ensureName(() => handleSave())}
            className="w-full rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-muted"
          >
            {saveStatus === 'saving'
              ? 'Saving…'
              : saveStatus === 'success'
                ? 'Saved!'
                : saveStatus === 'error'
                  ? 'Retry save'
                  : 'Save selection'}
          </button>
        )}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Collaborators
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {collaborators.length === 0 ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                Add your name when you edit to join the roster.
              </span>
            ) : (
              collaborators.map((person) => (
                <span key={person} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                  {getInitials(person)}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <aside id="selection" className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
      <div className="hidden h-full rounded-3xl border border-slate-200 bg-white p-5 shadow-lg lg:block">
        {panelContent}
      </div>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-xl"
        >
          My Selection ({lines.length})
        </button>
        {mobileOpen && (
          <div className="fixed inset-0 z-40 flex flex-col bg-slate-900/60">
            <div className="mt-auto rounded-t-3xl bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">My Selection</h2>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-semibold text-slate-500"
                >
                  Close
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto pr-1">{panelContent}</div>
            </div>
          </div>
        )}
      </div>
      <AttributionPrompt
        open={promptOpen}
        defaultValue={name}
        onClose={() => {
          setPromptOpen(false);
          setPendingAction(null);
        }}
        onSubmit={(value) => {
          saveName(value);
          setPromptOpen(false);
          pendingAction?.(value);
          setPendingAction(null);
        }}
      />
      <ShareDialog
        open={shareOpen}
        selectionId={selection?.id}
        onClose={() => setShareOpen(false)}
      />
    </aside>
  );
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}
