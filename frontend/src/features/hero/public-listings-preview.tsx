'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ListingCard } from '@/components/listing-card';
import { Button } from '@/components/ui';
import { listListings } from '@/lib/api/listings';
import type { Listing } from '@/lib/api/types';

export function PublicListingsPreview() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listListings({ sort: 'createdAt_desc', limit: 3 })
      .then((result) => {
        if (!cancelled) setListings(result.data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed || listings.length === 0) {
    return (
      <div className="rounded-2xl border border-forest/10 bg-paper p-6">
        <p className="text-ink/70">
          Open the marketplace to see live produce from farmers — no account required to browse.
        </p>
        <Link href="/marketplace" className="mt-4 inline-block">
          <Button>Browse marketplace</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
      <div className="mt-6">
        <Link href="/marketplace">
          <Button variant="secondary">See all listings</Button>
        </Link>
      </div>
    </div>
  );
}
