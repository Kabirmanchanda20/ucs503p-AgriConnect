import type { Metadata } from 'next';
import { Fraunces, Noto_Sans_Devanagari, Noto_Sans_Gurmukhi, Nunito } from 'next/font/google';
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

const notoDevanagari = Noto_Sans_Devanagari({
  variable: '--font-noto-deva',
  subsets: ['devanagari'],
  weight: ['400', '600', '700'],
});

const notoGurmukhi = Noto_Sans_Gurmukhi({
  variable: '--font-noto-gur',
  subsets: ['gurmukhi'],
  weight: ['400', '600', '700'],
});

export const metadata: Metadata = {
  title: 'AgriConnect — Sell harvest. Buy produce. Direct.',
  description:
    'Free farm-to-market marketplace: farmers list crops with photos, buyers filter by crop and district, and both track orders in one place.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${nunito.variable} ${fraunces.variable} ${notoDevanagari.variable} ${notoGurmukhi.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
