'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireAuth } from '@/features/auth/guards';
import { ListingCard } from '@/components/listing-card';
import { Button, EmptyState, Spinner } from '@/components/ui';
import { listListings } from '@/lib/api/listings';
import type { Listing } from '@/lib/api/types';

function FarmerListings() {
  const [listings, setListings] = useState<Listing[] | null>(null);

  useEffect(() => {
    void listListings({ mine: true, limit: 50 }).then((result) => setListings(result.data));
  }, []);

  if (!listings) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl text-forest">My listings</h1>
        <Link href="/farmer/listings/new">
          <Button>Add produce</Button>
        </Link>
      </div>
      {listings.length === 0 ? (
        <EmptyState title="Nothing listed" body="Add a crop with quantity, price, and a photo." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <div key={listing.id} className="space-y-2">
              <ListingCard listing={listing} />
              <Link href={`/farmer/listings/${listing.id}/edit`} className="block text-center font-semibold text-leaf">
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FarmerListingsPage() {
  return (
    <RequireAuth roles={['FARMER']}>
      <FarmerListings />
    </RequireAuth>
  );
}
