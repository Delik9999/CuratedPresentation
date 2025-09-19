'use client';

import { useState } from 'react';

export type ExportMenuProps = {
  selectionId?: string;
  disabled?: boolean;
};

export function ExportMenu({ selectionId, disabled }: ExportMenuProps) {
  const [isLoading, setIsLoading] = useState<'pdf' | 'csv' | null>(null);

  const handleExport = async (format: 'pdf' | 'csv') => {
    if (!selectionId) return;
    setIsLoading(format);
    try {
      const response = await fetch(`/api/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectionId }),
      });
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `selection-${selectionId}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Export is unavailable right now.');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="inline-flex gap-2">
      <button
        type="button"
        disabled={disabled || !selectionId || isLoading === 'pdf'}
        onClick={() => handleExport('pdf')}
        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isLoading === 'pdf' ? 'Exporting…' : 'Export PDF'}
      </button>
      <button
        type="button"
        disabled={disabled || !selectionId || isLoading === 'csv'}
        onClick={() => handleExport('csv')}
        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
      >
        {isLoading === 'csv' ? 'Exporting…' : 'Export CSV'}
      </button>
    </div>
  );
}
