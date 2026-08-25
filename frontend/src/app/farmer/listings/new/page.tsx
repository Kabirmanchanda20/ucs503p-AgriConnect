'use client';

import { RequireAuth } from '@/features/auth/guards';
import { ListingForm } from '@/features/listings/listing-form';

export default function NewListingPage() {
  return (
    <RequireAuth roles={['FARMER']}>
      <div className="space-y-4">
        <h1 className="font-display text-4xl text-forest">Add produce</h1>
        <ListingForm />
      </div>
    </RequireAuth>
  );
}
