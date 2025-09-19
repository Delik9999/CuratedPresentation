import Link from 'next/link';
import { ArrowRightIcon } from '@/components/icons/ArrowRightIcon';

export default function HomePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
      <span className="mb-4 inline-flex items-center rounded-full bg-brand/10 px-4 py-1 text-sm font-medium text-brand">
        Curated, collaborative & dealer-ready
      </span>
      <h1 className="text-4xl font-semibold text-slate-900 md:text-5xl">
        Story-driven showroom selections that travel with your team
      </h1>
      <p className="mt-6 text-lg text-slate-600">
        Build launch assortments faster with new intros, market highlights, and
        previous winners tailored to each dealer. Save and share selections in
        minutes—no cart, no checkout, just ready-to-send storytelling.
      </p>
      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/showroom?dealer=robinson"
          className="group inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-muted"
        >
          View Curated Selections
          <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-1" />
        </Link>
        <Link
          href="/showroom"
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-semibold text-brand shadow-sm ring-1 ring-slate-200 transition hover:ring-brand/30"
        >
          Browse as guest
        </Link>
      </div>
      <dl className="mt-16 grid w-full grid-cols-1 gap-6 text-left sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <dt className="text-sm font-medium text-slate-500">Dealer-ready stories</dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-900">
            Market intros + proven winners in one view
          </dd>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <dt className="text-sm font-medium text-slate-500">Collaborate instantly</dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-900">
            Attribute picks, favorites, and nudges per teammate
          </dd>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <dt className="text-sm font-medium text-slate-500">Share in seconds</dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-900">
            Export polished PDFs & CSV assortments
          </dd>
        </div>
      </dl>
    </div>
  );
}
