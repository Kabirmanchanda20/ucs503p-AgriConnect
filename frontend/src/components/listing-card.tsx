'use client';

import Link from 'next/link';
import { Badge, Card } from '@/components/ui';
import { ListingPhoto } from '@/components/listing-photo';
import { useLocale } from '@/features/i18n/locale-context';
import { formatMoney, formatQty } from '@/lib/format';
import { categoryKey } from '@/lib/i18n';
import type { Listing } from '@/lib/api/types';
import type { MandiCompareResult } from '@/lib/api/market';
import { MandiCompareBadge } from '@/components/mandi-compare-badge';

const statusTone = {
  draft: 'neutral',
  active: 'good',
  sold_out: 'warn',
  expired: 'warn',
  removed: 'bad',
} as const;

export function ListingCard({
  listing,
  mandiCompare,
}: {
  listing: Listing;
  mandiCompare?: MandiCompareResult | null;
}) {
  const { locale, t } = useLocale();
  const unit = t(`units.${listing.unit}`);
  const category = categoryKey(listing.category);

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group block h-full rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
    >
      <Card className="flex h-full flex-col overflow-hidden p-0 transition duration-200 group-hover:border-leaf/40 group-hover:shadow-[0_12px_28px_rgba(31,61,43,0.10)]">
        <div className="relative aspect-[16/10] overflow-hidden bg-forest/8">
          <ListingPhoto
            crop={listing.crop}
            src={listing.photos[0]?.publicUrl}
            className="transition duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute start-2.5 top-2.5 flex flex-wrap gap-1.5">
            {listing.status !== 'active' ? (
              <Badge tone={statusTone[listing.status]} onImage>
                {t(`listing.status.${listing.status}`)}
              </Badge>
            ) : null}
            {listing.perishable ? (
              <Badge tone="gold" onImage>{t('listing.perishable')}</Badge>
            ) : null}
            {mandiCompare ? <MandiCompareBadge compare={mandiCompare} onImage /> : null}
          </div>
        </div>
        <div className="flex flex-1 flex-col px-4 py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-soil">
            {category ? t(category) : listing.category}
          </p>
          <h3 className="mt-1 font-display text-xl leading-tight text-forest">{listing.crop}</h3>
          <p className="mt-1 text-sm text-ink/60">
            {listing.district}, {listing.state}
          </p>
          <div className="mt-auto border-t border-forest/8 pt-3">
            <p className="text-base font-bold text-forest">
              {formatMoney(listing.pricePerUnit, locale)}{' '}
              <span className="text-sm font-medium text-ink/45">/ {unit}</span>
            </p>
            <p className="mt-0.5 text-xs text-ink/55">
              {t('listing.leftLine', {
                qty: formatQty(listing.quantity, unit, locale),
                min: formatQty(listing.minimumOrderQuantity, unit, locale),
              })}
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
