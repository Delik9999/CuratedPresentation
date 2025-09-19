'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

export type AttributionPromptProps = {
  open: boolean;
  defaultValue?: string | null;
  onClose: () => void;
  onSubmit: (name: string) => void;
};

export function AttributionPrompt({
  open,
  defaultValue,
  onClose,
  onSubmit,
}: AttributionPromptProps) {
  const [value, setValue] = useState(defaultValue ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue ?? '');
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timeout);
    }
  }, [open, defaultValue]);

  if (!open) return null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">Who&apos;s collaborating?</h2>
        <p className="mt-2 text-sm text-slate-500">
          We tag picks and favorites by name so your team knows who suggested
          what. Add your name once to keep things personal.
        </p>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Your name
        </label>
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-base shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          placeholder="e.g. Sierra"
        />
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-muted"
          >
            Let&apos;s go
          </button>
        </div>
      </form>
    </div>
  );
}
