'use client';

import { useEffect, useState } from 'react';
import { RequireAuth } from '@/features/auth/guards';
import { ListingCard } from '@/components/listing-card';
import { Alert, Button, Card, Field, Select, Spinner } from '@/components/ui';
import { listListings } from '@/lib/api/listings';
import { moderateListing } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import type { Listing, ListingStatus } from '@/lib/api/types';

function AdminListings() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<ListingStatus>('active');

  function reload(nextStatus = status) {
    void listListings({ status: nextStatus, limit: 50 }).then((result) =>
      setListings(result.data),
    );
  }

  useEffect(() => {
    reload('active');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function moderate(id: string, next: 'removed' | 'active') {
    setError('');
    try {
      await moderateListing(id, {
        status: next,
        reason: next === 'removed' ? 'Removed by admin' : 'Reinstated by admin',
      });
      reload();
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  if (!listings) return <Spinner />;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl text-forest">Listing moderation</h1>
      <Card>
        <form
          className="flex flex-wrap gap-3"
          action={(form) => {
            const next = String(form.get('status')) as ListingStatus;
            setStatus(next);
            reload(next);
          }}
        >
          <Field label="Status">
            <Select name="status" defaultValue={status}>
              <option value="active">active</option>
              <option value="draft">draft</option>
              <option value="sold_out">sold_out</option>
              <option value="expired">expired</option>
              <option value="removed">removed</option>
            </Select>
          </Field>
          <Button className="mt-7" type="submit">
            Filter
          </Button>
        </form>
      </Card>
      {error ? <Alert>{error}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {listings.map((listing) => (
          <div key={listing.id} className="space-y-2">
            <ListingCard listing={listing} />
            <div className="flex gap-2">
              <Button type="button" variant="danger" onClick={() => void moderate(listing.id, 'removed')}>
                Remove
              </Button>
              <Button type="button" variant="secondary" onClick={() => void moderate(listing.id, 'active')}>
                Reinstate
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminListingsPage() {
  return (
    <RequireAuth roles={['ADMIN']}>
      <AdminListings />
    </RequireAuth>
  );
}
