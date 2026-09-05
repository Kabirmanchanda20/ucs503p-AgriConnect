'use client';

import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui';
import { PublicListingsPreview } from '@/features/home/public-listings-preview';
import { useLocale } from '@/features/i18n/locale-context';

export default function HomePage() {
  const { t } = useLocale();

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl bg-forest px-6 py-14 text-paper md:px-12">
        <Logo variant="hero" linked={false} className="mb-6" />
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-harvest">
          {t('home.eyebrow')}
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-5xl leading-tight md:text-6xl">
          {t('home.title')}
        </h1>
        <p className="mt-5 max-w-xl text-lg text-paper/80">{t('home.subtitle')}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/marketplace">
            <Button variant="gold">{t('home.browseListings')}</Button>
          </Link>
          <Link href="/register">
            <Button variant="outline-light">{t('home.createAccount')}</Button>
          </Link>
        </div>
      </section>

      <section>
        <Link
          href="/marketplace"
          className="group block overflow-hidden rounded-2xl border border-forest/10 bg-paper shadow-[0_8px_30px_rgba(31,61,43,0.06)] transition hover:border-leaf/40 hover:shadow-[0_12px_28px_rgba(31,61,43,0.10)]"
        >
          <div className="grid md:grid-cols-[1.1fr_1fr]">
            <div className="relative min-h-[200px] md:min-h-[260px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/crops/tomato.jpg"
                alt={t('home.marketplaceTitle')}
                className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-8">
              <h2 className="font-display text-3xl text-forest">{t('home.marketplaceTitle')}</h2>
              <p className="mt-3 text-ink/70">{t('home.marketplaceBody')}</p>
              <p className="mt-5 text-sm font-bold text-leaf group-hover:underline">
                {t('home.marketplaceCta')}
              </p>
            </div>
          </div>
        </Link>
      </section>

      <section>
        <h2 className="font-display text-3xl text-forest">{t('home.onMarketTitle')}</h2>
        <p className="mt-2 max-w-2xl text-ink/70">{t('home.onMarketBody')}</p>
        <div className="mt-6">
          <PublicListingsPreview />
        </div>
      </section>
    </div>
  );
}
