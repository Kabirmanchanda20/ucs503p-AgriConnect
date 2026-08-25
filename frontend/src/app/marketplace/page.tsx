'use client';

import { useEffect, useState } from 'react';
import { ListingCard } from '@/components/listing-card';
import { Alert, Button, Card, EmptyState, Field, Input, Select, Spinner } from '@/components/ui';
import { listListings, type ListingFilters } from '@/lib/api/listings';
import { getErrorMessage } from '@/lib/api/errors';
import type { Listing } from '@/lib/api/types';
import { CROP_CATEGORIES, INDIAN_STATES } from '@/lib/constants';

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<ListingFilters>({
    sort: 'createdAt_desc',
    page: 1,
    limit: 12,
  });

  useEffect(() => {
    let cancelled = false;
    void listListings(filters)
      .then((result) => {
        if (!cancelled) {
          setListings(result.data);
          setError('');
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(getErrorMessage(cause, 'Could not load listings'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  function apply(form: FormData) {
    setLoading(true);
    setFilters({
      crop: String(form.get('crop') || '') || undefined,
      category: String(form.get('category') || '') || undefined,
      state: String(form.get('state') || '') || undefined,
      minPrice: String(form.get('minPrice') || '') || undefined,
      maxPrice: String(form.get('maxPrice') || '') || undefined,
      sort: (String(form.get('sort') || 'createdAt_desc') as ListingFilters['sort']),
      page: 1,
      limit: 12,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl text-forest">Marketplace</h1>
        <p className="mt-1 text-ink/70">Find produce listed by farmers across India.</p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <Card>
        <form className="grid gap-3 md:grid-cols-6" action={apply}>
          <Field label="Crop">
            <Input name="crop" placeholder="Wheat" defaultValue={filters.crop} />
          </Field>
          <Field label="Category">
            <Select name="category" defaultValue={filters.category ?? ''}>
              <option value="">Any</option>
              {CROP_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="State">
            <Select name="state" defaultValue={filters.state ?? ''}>
              <option value="">Any</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Min ₹">
            <Input name="minPrice" defaultValue={filters.minPrice} />
          </Field>
          <Field label="Max ₹">
            <Input name="maxPrice" defaultValue={filters.maxPrice} />
          </Field>
          <Field label="Sort">
            <Select name="sort" defaultValue={filters.sort}>
              <option value="createdAt_desc">Newest</option>
              <option value="price_asc">Price: low</option>
              <option value="price_desc">Price: high</option>
              <option value="harvestDate_asc">Harvest date</option>
            </Select>
          </Field>
          <div className="md:col-span-6">
            <Button type="submit">Apply filters</Button>
          </div>
        </form>
      </Card>
      {loading ? (
        <Spinner />
      ) : listings.length === 0 ? (
        <EmptyState
          title="No listings yet"
          body="Try another crop or state, or check back after farmers post harvest."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
