import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold text-brand">
          Lib&Co Showroom
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="/" className="hover:text-brand">
            Home
          </Link>
          <Link href="/showroom" className="hover:text-brand">
            All Collections
          </Link>
          <a href="#search" className="hover:text-brand">
            Search
          </a>
          <a href="#selection" className="hover:text-brand">
            My Selection
          </a>
        </nav>
        <Link
          href="/showroom?dealer=robinson"
          className="hidden rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-muted sm:inline-flex"
        >
          Dealer preview
        </Link>
      </div>
    </header>
  );
}
