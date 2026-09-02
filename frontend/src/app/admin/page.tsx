'use client';

import { useEffect, useState } from 'react';
import { RequireAuth } from '@/features/auth/guards';
import { Card, Spinner, Alert } from '@/components/ui';
import { getAdminAnalytics } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { formatMoney } from '@/lib/format';
import type { AdminAnalytics } from '@/lib/api/types';

function AdminHome() {
  const [stats, setStats] = useState<AdminAnalytics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void getAdminAnalytics()
      .then((result) => setStats(result.data))
      .catch((cause) => setError(getErrorMessage(cause)));
  }, []);

  if (error && !stats) return <Alert>{error}</Alert>;
  if (!stats) return <Spinner />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl text-forest">Admin overview</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm font-bold uppercase text-soil">Users</p>
          <p className="font-display text-4xl">{stats.totalUsers}</p>
        </Card>
        <Card>
          <p className="text-sm font-bold uppercase text-soil">Listings</p>
          <p className="font-display text-4xl">{stats.totalListings}</p>
          <p className="text-sm text-ink/60">{stats.activeListings ?? '—'} active</p>
        </Card>
        <Card>
          <p className="text-sm font-bold uppercase text-soil">Orders</p>
          <p className="font-display text-4xl">{stats.totalOrders}</p>
        </Card>
        <Card>
          <p className="text-sm font-bold uppercase text-soil">GMV</p>
          <p className="font-display text-4xl">{formatMoney(stats.gmv)}</p>
        </Card>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth roles={['ADMIN']}>
      <AdminHome />
    </RequireAuth>
  );
}
