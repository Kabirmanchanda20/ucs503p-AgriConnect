'use client';

import { useEffect, useState } from 'react';
import { ListingCard } from '@/components/listing-card';
import { Alert, Button, Card, EmptyState, Field, Input, Select, Spinner } from '@/components/ui';
import { listListings, type ListingFilters } from '@/lib/api/listings';
import { getErrorMessage } from '@/lib/api/errors';
import { isPublicListing } from '@/lib/listing-display';
import type { Listing } from '@/lib/api/types';
import { compareListingPrices, type MandiCompareResult } from '@/lib/api/market';
import { CROP_CATEGORIES, INDIAN_STATES } from '@/lib/constants';
import { useLocale } from '@/features/i18n/locale-context';

function mandiCompareMap(results: MandiCompareResult[]): Record<string, MandiCompareResult> {
  return Object.fromEntries(results.map((row) => [row.id, row]));
}

export default function MarketplacePage() {
  const { t } = useLocale();
  const [listings, setListings] = useState<Listing[]>([]);
  const [mandiCompare, setMandiCompare] = useState<Record<string, MandiCompareResult>>({});
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
      .then(async (result) => {
        if (cancelled) return;
        const data = result.data;
        setListings(data);
        setError('');
        if (data.length === 0) {
          setMandiCompare({});
          return;
        }
        try {
          const compareResult = await compareListingPrices(
            data.map((listing) => ({
              id: listing.id,
              crop: listing.crop,
              state: listing.state,
              pricePerUnit: listing.pricePerUnit,
              unit: listing.unit,
            })),
          );
          if (!cancelled) setMandiCompare(mandiCompareMap(compareResult.data));
        } catch {
          if (!cancelled) setMandiCompare({});
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(getErrorMessage(cause, t('marketplace.loadFail')));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, t]);

  function apply(form: FormData) {
    setLoading(true);
    setMandiCompare({});
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
        <h1 className="font-display text-4xl text-forest">{t('marketplace.title')}</h1>
        <p className="mt-1 text-ink/70">{t('marketplace.subtitle')}</p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <Card>
        <form className="grid gap-3 md:grid-cols-6" action={apply}>
          <Field label={t('marketplace.crop')}>
            <Input name="crop" placeholder="Wheat" defaultValue={filters.crop} />
          </Field>
          <Field label={t('marketplace.category')}>
            <Select name="category" defaultValue={filters.category ?? ''}>
              <option value="">{t('common.select')}</option>
              {CROP_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('marketplace.state')}>
            <Select name="state" defaultValue={filters.state ?? ''}>
              <option value="">{t('common.select')}</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('marketplace.minPrice')}>
            <Input name="minPrice" defaultValue={filters.minPrice} />
          </Field>
          <Field label={t('marketplace.maxPrice')}>
            <Input name="maxPrice" defaultValue={filters.maxPrice} />
          </Field>
          <Field label={t('marketplace.sort')}>
            <Select name="sort" defaultValue={filters.sort}>
              <option value="createdAt_desc">Newest</option>
              <option value="price_asc">Price: low</option>
              <option value="price_desc">Price: high</option>
              <option value="harvestDate_asc">Harvest date</option>
            </Select>
          </Field>
          <div className="md:col-span-6">
            <Button type="submit">{t('marketplace.apply')}</Button>
          </div>
        </form>
      </Card>
      {loading ? (
        <Spinner />
      ) : listings.length === 0 ? (
        <EmptyState
          title={t('marketplace.empty')}
          body={t('marketplace.subtitle')}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.filter((listing) => isPublicListing(listing.crop)).map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              mandiCompare={mandiCompare[listing.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
