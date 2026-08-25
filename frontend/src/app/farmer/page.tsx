'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireAuth } from '@/features/auth/guards';
import { Button, Card, EmptyState, Spinner } from '@/components/ui';
import { getMyReport } from '@/lib/api/reports';
import { listListings } from '@/lib/api/listings';
import { listOrders } from '@/lib/api/orders';
import { formatMoney } from '@/lib/format';
import type { FarmerReport } from '@/lib/api/types';

function FarmerHome() {
  const [report, setReport] = useState<FarmerReport | null>(null);
  const [openOrders, setOpenOrders] = useState(0);
  const [activeListings, setActiveListings] = useState(0);

  useEffect(() => {
    void getMyReport().then((result) => {
      if (result.data.role === 'FARMER') setReport(result.data);
    });
    void listOrders({ status: 'pending', limit: 1 }).then((result) =>
      setOpenOrders(result.pagination?.total ?? result.data.length),
    );
    void listListings({ mine: true, status: 'active', limit: 1 }).then((result) =>
      setActiveListings(result.pagination?.total ?? result.data.length),
    );
  }, []);

  if (!report) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-forest">Farmer desk</h1>
          <p className="text-ink/70">Your harvest, listings, and incoming orders.</p>
        </div>
        <Link href="/farmer/listings/new">
          <Button>Add produce</Button>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-bold uppercase text-soil">Listings</p>
          <p className="font-display text-4xl text-forest">{report.totalListings}</p>
          <p className="text-sm text-ink/60">{activeListings} active now</p>
        </Card>
        <Card>
          <p className="text-sm font-bold uppercase text-soil">Revenue (fulfilled)</p>
          <p className="font-display text-4xl text-forest">{formatMoney(report.revenue)}</p>
        </Card>
        <Card>
          <p className="text-sm font-bold uppercase text-soil">Qty sold</p>
          <p className="font-display text-4xl text-forest">{report.totalQuantitySold}</p>
          <p className="text-sm text-ink/60">{openOrders} pending orders</p>
        </Card>
      </div>
      {report.totalListings === 0 ? (
        <EmptyState
          title="No listings yet"
          body="Create a draft, add a photo, then publish for buyers."
          action={
            <Link href="/farmer/listings/new">
              <Button>Create first listing</Button>
            </Link>
          }
        />
      ) : null}
    </div>
  );
}

export default function FarmerPage() {
  return (
    <RequireAuth roles={['FARMER']}>
      <FarmerHome />
    </RequireAuth>
  );
}
