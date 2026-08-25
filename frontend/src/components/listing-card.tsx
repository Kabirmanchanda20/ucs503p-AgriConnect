import Link from 'next/link';
import { Badge, Card } from '@/components/ui';
import { formatMoney, formatQty, titleCase } from '@/lib/format';
import type { Listing } from '@/lib/api/types';

const statusTone = {
  draft: 'neutral',
  active: 'good',
  sold_out: 'warn',
  expired: 'warn',
  removed: 'bad',
} as const;

export function ListingCard({ listing }: { listing: Listing }) {
  const photo = listing.photos[0]?.publicUrl;
  return (
    <Link href={`/listings/${listing.id}`} className="block h-full">
      <Card className="flex h-full flex-col overflow-hidden p-0">
        <div className="relative h-44 bg-forest/10">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={listing.crop} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center font-display text-3xl text-forest/40">
              {listing.crop.slice(0, 1)}
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge tone={statusTone[listing.status]}>{titleCase(listing.status)}</Badge>
            {listing.perishable ? <Badge tone="gold">Perishable</Badge> : null}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-soil">
            {listing.category}
          </p>
          <h3 className="font-display text-2xl text-forest">{listing.crop}</h3>
          <p className="text-ink/70">
            {listing.district}, {listing.state}
          </p>
          <p className="mt-auto pt-3 text-lg font-bold text-forest">
            {formatMoney(listing.pricePerUnit)} / {listing.unit}
          </p>
          <p className="text-sm text-ink/60">
            {formatQty(listing.quantity, listing.unit)} left · MOQ{' '}
            {formatQty(listing.minimumOrderQuantity, listing.unit)}
          </p>
        </div>
      </Card>
    </Link>
  );
}
