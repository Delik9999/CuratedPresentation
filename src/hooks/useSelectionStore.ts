'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
    (set, get) => ({
      selection: undefined,
      collaborators: [],
      favoriteLedger: {},
      initialize: (selection) => {
        set(() => ({
          selection,
          favoriteLedger: buildLedger(selection),
          collaborators: deriveCollaborators(selection),
        }));
      },
      setCollaborator: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => {
          if (state.collaborators.includes(trimmed)) {
            return state;
          }
          return { ...state, collaborators: [...state.collaborators, trimmed] };
        });
      },
      addLine: (line, actor) => {
        const trimmedActor = actor.trim();
        if (!trimmedActor) return;
        set((state) => {
          const selection = state.selection;
          if (!selection) return state;

          const existingIndex = selection.lines.findIndex((l) => l.sku === line.sku);
          let updatedLines: SelectionLine[];

          if (existingIndex >= 0) {
            const existing = selection.lines[existingIndex];
            const nextLine: SelectionLine = {
              ...existing,
              qty: existing.qty + line.qty,
              notes: line.notes ?? existing.notes,
              pickedBy: existing.pickedBy.includes(trimmedActor)
                ? existing.pickedBy
                : [...existing.pickedBy, trimmedActor],
            };
            updatedLines = selection.lines.map((item, idx) =>
              idx === existingIndex ? nextLine : item
            );
          } else {
            updatedLines = [
              ...selection.lines,
              { ...line, pickedBy: [trimmedActor], favorites: [] },
            ];
          }

          const updatedSelection: Selection = {
            ...selection,
            lines: updatedLines,
            updatedAt: new Date().toISOString(),
          };

          const collaborators = state.collaborators.includes(trimmedActor)
            ? state.collaborators
            : [...state.collaborators, trimmedActor];

          return {
            ...state,
            selection: updatedSelection,
            collaborators,
          };
        });
      },
      removeLine: (sku) => {
        set((state) => {
          const selection = state.selection;
          if (!selection) return state;
          const updatedLines = selection.lines.filter((line) => line.sku !== sku);
          if (updatedLines.length === selection.lines.length) {
            return state;
          }

          const updatedSelection: Selection = {
            ...selection,
            lines: updatedLines,
            updatedAt: new Date().toISOString(),
          };

          return {
            ...state,
            selection: updatedSelection,
            favoriteLedger: buildLedger(updatedSelection),
          };
        });
      },
      updateQty: (sku, qty) => {
        set((state) => {
          const selection = state.selection;
          if (!selection) return state;
          const updatedLines = selection.lines.map((line) =>
            line.sku === sku ? { ...line, qty } : line
          );
          const hasChanged = selection.lines.some((line) => line.sku === sku);
          if (!hasChanged) {
            return state;
          }

          const updatedSelection: Selection = {
            ...selection,
            lines: updatedLines,
            updatedAt: new Date().toISOString(),
          };

          return { ...state, selection: updatedSelection };
        });
      },
      updateNotes: (sku, notes) => {
        set((state) => {
          const selection = state.selection;
          if (!selection) return state;
          const updatedLines = selection.lines.map((line) =>
            line.sku === sku ? { ...line, notes } : line
          );
          const hasChanged = selection.lines.some((line) => line.sku === sku);
          if (!hasChanged) {
            return state;
          }

          const updatedSelection: Selection = {
            ...selection,
            lines: updatedLines,
            updatedAt: new Date().toISOString(),
          };

          return { ...state, selection: updatedSelection };
        });
      },
      toggleFavorite: (sku, actor, collectionId, limit = MAX_FAVORITES_PER_COLLECTION) => {
        const trimmedActor = actor.trim();
        if (!trimmedActor || !collectionId) {
          return { status: 'denied', remaining: 0 };
        }

        const state = get();
        const selection = state.selection;
        if (!selection) {
          return { status: 'denied', remaining: 0 };
        }

        const lineIndex = selection.lines.findIndex((line) => line.sku === sku);
        if (lineIndex === -1) {
          return { status: 'denied', remaining: 0 };
        }

        const line = selection.lines[lineIndex];
        const ledger = state.favoriteLedger[collectionId] ?? {};
        const currentCount = ledger[trimmedActor] ?? 0;
        const hasFavorite = line.favorites.includes(trimmedActor);

        if (!hasFavorite && currentCount >= limit) {
          return { status: 'denied', remaining: 0 };
        }

        const updatedFavorites = hasFavorite
          ? line.favorites.filter((name) => name !== trimmedActor)
          : [...line.favorites, trimmedActor];

        const updatedLines = selection.lines.map((item, idx) =>
          idx === lineIndex ? { ...item, favorites: updatedFavorites } : item
        );

        const updatedSelection: Selection = {
          ...selection,
          lines: updatedLines,
          updatedAt: new Date().toISOString(),
        };

        const updatedLedger = buildLedger(updatedSelection);
        const collaborators = state.collaborators.includes(trimmedActor)
          ? state.collaborators
          : [...state.collaborators, trimmedActor];

        set({
          selection: updatedSelection,
          favoriteLedger: updatedLedger,
          collaborators,
        });

        const updatedCount = updatedLedger[collectionId]?.[trimmedActor] ?? 0;
        const remaining = Math.max(0, limit - updatedCount);

        return {
          status: hasFavorite ? 'removed' : 'added',
          remaining,
        };
      },
      clear: () => {
        set((state) => {
          const selection = state.selection;
          if (!selection) return state;
          const clearedSelection: Selection = {
            ...selection,
            lines: [],
            updatedAt: new Date().toISOString(),
          };

          return {
            ...state,
            selection: clearedSelection,
            favoriteLedger: {},
          };
        });
      },
      replaceSelection: (selection) => {
        set((state) => ({
          ...state,
          selection,
          favoriteLedger: buildLedger(selection),
          collaborators: deriveCollaborators(selection),
        }));
      },
    }),
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
