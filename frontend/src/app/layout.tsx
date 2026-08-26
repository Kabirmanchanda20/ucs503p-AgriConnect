import type { Metadata } from 'next';
import { Fraunces, Nunito } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
});

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AgriConnect — Sell harvest. Buy produce. Direct.',
  description:
    'Free farm-to-market marketplace: farmers list crops with photos, buyers filter by crop and district, and both track orders in one place.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${nunito.variable} ${fraunces.variable} h-full`}>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
