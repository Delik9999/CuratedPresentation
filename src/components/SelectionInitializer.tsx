'use client';

import { useEffect } from 'react';
import type { Selection } from '@/lib/types';
import { useSelectionStore } from '@/hooks/useSelectionStore';

export type SelectionInitializerProps = {
  selection: Selection | null;
};

export function SelectionInitializer({ selection }: SelectionInitializerProps) {
  const initialize = useSelectionStore((state) => state.initialize);

  useEffect(() => {
    if (selection) {
      initialize(selection);
    }
  }, [initialize, selection]);

  return null;
}
