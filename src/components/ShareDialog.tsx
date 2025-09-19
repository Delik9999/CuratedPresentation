'use client';

import { useEffect, useState } from 'react';

export type ShareDialogProps = {
  open: boolean;
  selectionId?: string;
  onClose: () => void;
};

type ShareResponse = {
  url: string;
};

export function ShareDialog({ open, selectionId, onClose }: ShareDialogProps) {
  const [shareUrl, setShareUrl] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle');

  useEffect(() => {
    if (!open || !selectionId) return;
    let active = true;
    setStatus('loading');
    fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectionId }),
    })
      .then((res) => res.json() as Promise<ShareResponse>)
      .then((data) => {
        if (!active) return;
        setShareUrl(data.url);
        setStatus('idle');
      })
      .catch(() => {
        if (!active) return;
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [open, selectionId]);

  if (!open) return null;

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus('copied');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Shared! Copy this link to invite your team.</h2>
        <p className="mt-2 text-sm text-slate-500">
          Anyone with the link can view this selection. They can duplicate it to
          keep collaborating.
        </p>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {status === 'loading' ? 'Generating link…' : shareUrl}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Close
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-muted"
          >
            {status === 'copied' ? 'Copied!' : 'Copy link'}
          </button>
        </div>
        {status === 'error' && (
          <p className="mt-2 text-xs text-rose-500">
            Unable to generate link right now. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
