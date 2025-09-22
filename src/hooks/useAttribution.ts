'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'showroom-attribution-name';

export function useAttributionName() {
  const [name, setName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setName(stored);
    }
    setReady(true);
  }, []);

  const saveName = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setName(trimmed);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, trimmed);
    }
  };

  return { name, ready, saveName };
}
