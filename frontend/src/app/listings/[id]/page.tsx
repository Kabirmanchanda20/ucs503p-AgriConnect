'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { Alert, Badge, Button, Card, Field, Input, Select, Spinner, Textarea } from '@/components/ui';
import { ListingPhoto } from '@/components/listing-photo';
import { StarDisplay } from '@/components/star-rating';
import { createOrder } from '@/lib/api/orders';
import { getListing } from '@/lib/api/listings';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDate, formatMoney, formatQty, titleCase } from '@/lib/format';
import type { Listing } from '@/lib/api/types';

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void getListing(params.id)
      .then((result) => setListing(result.data))
      .catch((cause) => setError(getErrorMessage(cause, 'Listing not found')));
  }, [params.id]);

  if (error) return <Alert>{error}</Alert>;
  if (!listing) return <Spinner />;

  const photo = listing.photos[0]?.publicUrl;
  const canOrder = user?.role === 'BUYER' && listing.status === 'active' && !user.isSuspended;

  const currentListing = listing;

  async function placeOrder(form: FormData) {
    setError('');
    setPending(true);
    try {
      const { data } = await createOrder({
        listingId: currentListing.id,
        quantity: String(form.get('quantity') ?? ''),
        deliveryMode: String(form.get('deliveryMode')) === 'delivery' ? 'delivery' : 'pickup',
        notes: String(form.get('notes') || '') || undefined,
      });
      router.push(`/orders/${data.id}`);
    } catch (cause) {
      setError(getErrorMessage(cause, 'Could not place order'));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <Card className="overflow-hidden p-0">
        <div className="relative h-56 overflow-hidden bg-forest/8 sm:h-64">
          <ListingPhoto crop={listing.crop} src={photo} />
        </div>
        <div className="space-y-3 p-6">
          <div className="flex flex-wrap gap-2">
            <Badge tone="good">{titleCase(listing.status)}</Badge>
            {listing.perishable ? <Badge tone="gold">Perishable</Badge> : null}
            {listing.farmer?.verified ? <Badge>Verified farmer</Badge> : null}
          </div>
          <h1 className="font-display text-4xl text-forest">{listing.crop}</h1>
          <p className="text-ink/70">
            {listing.variety ? `${listing.variety} · ` : ''}
            {listing.district}, {listing.state}
          </p>
          <p className="text-2xl font-bold text-forest">
            {formatMoney(listing.pricePerUnit)} / {listing.unit}
          </p>
          <p>
            Available {formatQty(listing.quantity, listing.unit)} · Minimum order{' '}
            {formatQty(listing.minimumOrderQuantity, listing.unit)}
          </p>
          <p>Harvest date {formatDate(listing.harvestDate)}</p>
          {listing.description ? <p className="text-ink/80">{listing.description}</p> : null}
          {listing.farmer ? (
            <p className="text-sm text-ink/60">
              Sold by {listing.farmer.farmName || listing.farmer.name}
              {' · '}
              <StarDisplay value={listing.farmer.ratingAvg} />
            </p>
          ) : null}
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-2xl text-forest">Place an order</h2>
        {!user ? (
          <p className="mt-3 text-ink/70">Log in as a buyer to order this listing.</p>
        ) : user.role !== 'BUYER' ? (
          <p className="mt-3 text-ink/70">Only buyer accounts can place orders.</p>
        ) : listing.status !== 'active' ? (
          <p className="mt-3 text-ink/70">This listing is not open for orders.</p>
        ) : (
          <form className="mt-4 space-y-4" action={placeOrder}>
            {error ? <Alert>{error}</Alert> : null}
            <Field label={`Quantity (${listing.unit})`}>
              <Input
                name="quantity"
                required
                defaultValue={listing.minimumOrderQuantity}
              />
            </Field>
            <Field label="Delivery">
              <Select name="deliveryMode" defaultValue="pickup">
                <option value="pickup">I will pick up</option>
                <option value="delivery">Ask farmer to deliver</option>
              </Select>
            </Field>
            <Field label="Notes (optional)">
              <Textarea name="notes" />
            </Field>
            <Button type="submit" disabled={pending || !canOrder} className="w-full">
              {pending ? 'Placing order…' : 'Place order'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
