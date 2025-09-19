import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Curated Showroom Selections',
  description:
    'Dealer-ready curated showroom selections with collaborative tools and storytelling collections.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <Header />
        <main className="min-h-[calc(100vh-4rem)] px-4 pb-16 pt-8 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
