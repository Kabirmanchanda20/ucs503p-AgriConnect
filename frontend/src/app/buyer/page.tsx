'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireAuth } from '@/features/auth/guards';
import { Button, Card, Spinner } from '@/components/ui';
import { getMyReport } from '@/lib/api/reports';
import { listOrders } from '@/lib/api/orders';
import { formatMoney } from '@/lib/format';
import type { BuyerReport } from '@/lib/api/types';

function BuyerHome() {
  const [report, setReport] = useState<BuyerReport | null>(null);
  const [openOrders, setOpenOrders] = useState(0);

  useEffect(() => {
    void getMyReport().then((result) => {
      if (result.data.role === 'BUYER') setReport(result.data);
    });
    void listOrders({ limit: 1 }).then((result) =>
      setOpenOrders(result.pagination?.total ?? result.data.length),
    );
  }, []);

  if (!report) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-forest">Buyer desk</h1>
          <p className="text-ink/70">Search harvest and track your orders.</p>
        </div>
        <Link href="/marketplace">
          <Button>Browse produce</Button>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm font-bold uppercase text-soil">Orders</p>
          <p className="font-display text-4xl text-forest">{report.totalOrders}</p>
          <p className="text-sm text-ink/60">{openOrders} on record</p>
        </Card>
        <Card>
          <p className="text-sm font-bold uppercase text-soil">Spend (fulfilled)</p>
          <p className="font-display text-4xl text-forest">{formatMoney(report.totalSpend)}</p>
        </Card>
      </div>
    </div>
  );
}

export default function BuyerPage() {
  return (
    <RequireAuth roles={['BUYER']}>
      <BuyerHome />
    </RequireAuth>
  );
}
