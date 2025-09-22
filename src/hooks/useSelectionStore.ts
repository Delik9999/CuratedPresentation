'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Selection, SelectionLine } from '@/lib/types';

export type SelectionStore = {
  selection?: Selection;
  collaborators: string[];
  favoriteLedger: Record<string, Record<string, number>>;
  initialize: (selection: Selection) => void;
  setCollaborator: (name: string) => void;
  addLine: (line: SelectionLine, actor: string) => void;
  removeLine: (sku: string) => void;
  updateQty: (sku: string, qty: number) => void;
  updateNotes: (sku: string, notes: string) => void;
  toggleFavorite: (
    sku: string,
    actor: string,
    collectionId: string,
    limit?: number
  ) => { status: 'added' | 'removed' | 'denied'; remaining: number };
  clear: () => void;
  replaceSelection: (selection: Selection) => void;
};

const MAX_FAVORITES_PER_COLLECTION = 5;

type PersistedState = Pick<SelectionStore, 'selection' | 'collaborators' | 'favoriteLedger'>;

export const useSelectionStore = create<SelectionStore>()(
  persist(
    immer((set) => ({
      selection: undefined,
      collaborators: [],
      favoriteLedger: {},
      initialize: (selection) => {
        set((state) => {
          state.selection = selection;
          state.favoriteLedger = buildLedger(selection);
          state.collaborators = deriveCollaborators(selection);
        });
      },
      setCollaborator: (name) => {
        if (!name.trim()) return;
        set((state) => {
          if (!state.collaborators.includes(name)) {
            state.collaborators.push(name);
          }
        });
      },
      addLine: (line, actor) => {
        set((state) => {
          if (!state.selection) return;
          const existing = state.selection.lines.find((l) => l.sku === line.sku);
          if (existing) {
            existing.qty += line.qty;
            if (!existing.pickedBy.includes(actor)) {
              existing.pickedBy.push(actor);
            }
          } else {
            state.selection.lines.push({ ...line, pickedBy: [actor], favorites: [] });
          }
          state.selection.updatedAt = new Date().toISOString();
          if (!state.collaborators.includes(actor)) {
            state.collaborators.push(actor);
          }
        });
      },
      removeLine: (sku) => {
        set((state) => {
          if (!state.selection) return;
          state.selection.lines = state.selection.lines.filter((line) => line.sku !== sku);
          state.selection.updatedAt = new Date().toISOString();
        });
      },
      updateQty: (sku, qty) => {
        set((state) => {
          if (!state.selection) return;
          const line = state.selection.lines.find((l) => l.sku === sku);
          if (!line) return;
          line.qty = qty;
          state.selection.updatedAt = new Date().toISOString();
        });
      },
      updateNotes: (sku, notes) => {
        set((state) => {
          if (!state.selection) return;
          const line = state.selection.lines.find((l) => l.sku === sku);
          if (!line) return;
          line.notes = notes;
          state.selection.updatedAt = new Date().toISOString();
        });
      },
      toggleFavorite: (sku, actor, collectionId, limit = MAX_FAVORITES_PER_COLLECTION) => {
        let result: { status: 'added' | 'removed' | 'denied'; remaining: number } = {
          status: 'denied',
          remaining: 0,
        };
        set((state) => {
          if (!state.selection) return;
          const line = state.selection.lines.find((l) => l.sku === sku);
          if (!line) return;
          const ledger = state.favoriteLedger[collectionId] ?? {};
          const currentCount = ledger[actor] ?? 0;
          const hasFavorite = line.favorites.includes(actor);

          if (hasFavorite) {
            line.favorites = line.favorites.filter((name) => name !== actor);
            ledger[actor] = Math.max(0, currentCount - 1);
            result = { status: 'removed', remaining: limit - (ledger[actor] ?? 0) };
          } else {
            if (currentCount >= limit) {
              result = { status: 'denied', remaining: 0 };
              return;
            }
            line.favorites.push(actor);
            ledger[actor] = currentCount + 1;
            result = { status: 'added', remaining: limit - ledger[actor] };
          }

          state.favoriteLedger[collectionId] = ledger;
          state.selection.updatedAt = new Date().toISOString();
          if (!state.collaborators.includes(actor)) {
            state.collaborators.push(actor);
          }
        });

        return result;
      },
      clear: () => {
        set((state) => {
          if (!state.selection) return;
          state.selection.lines = [];
          state.selection.updatedAt = new Date().toISOString();
          state.favoriteLedger = {};
        });
      },
      replaceSelection: (selection) => {
        set((state) => {
          state.selection = selection;
          state.favoriteLedger = buildLedger(selection);
          state.collaborators = deriveCollaborators(selection);
        });
      },
    })),
    {
      name: 'selection-store',
      partialize: (state) => ({
        selection: state.selection,
        collaborators: state.collaborators,
        favoriteLedger: state.favoriteLedger,
      } satisfies PersistedState),
    }
  )
);

function buildLedger(selection: Selection | undefined) {
  const ledger: Record<string, Record<string, number>> = {};
  if (!selection) return ledger;
  for (const line of selection.lines) {
    if (!line.collectionId) continue;
    if (!ledger[line.collectionId]) ledger[line.collectionId] = {};
    for (const name of line.favorites) {
      const entry = ledger[line.collectionId][name] ?? 0;
      ledger[line.collectionId][name] = entry + 1;
    }
  }
  return ledger;
}

function deriveCollaborators(selection: Selection | undefined) {
  if (!selection) return [] as string[];
  const names = new Set<string>();
  for (const line of selection.lines) {
    line.pickedBy.forEach((name) => names.add(name));
    line.favorites.forEach((name) => names.add(name));
  }
  return Array.from(names);
}
