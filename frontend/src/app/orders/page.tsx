'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireAuth } from '@/features/auth/guards';
import { Badge, Card, EmptyState, Spinner } from '@/components/ui';
import { listOrders } from '@/lib/api/orders';
import { formatDate, formatMoney, formatQty, titleCase } from '@/lib/format';
import type { Order } from '@/lib/api/types';

const tones = {
  pending: 'warn',
  accepted: 'gold',
  confirmed: 'good',
  fulfilled: 'good',
  cancelled: 'bad',
} as const;

function OrdersList() {
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    void listOrders({ limit: 50 }).then((result) => setOrders(result.data));
  }, []);

  if (!orders) return <Spinner />;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl text-forest">Orders</h1>
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" body="Buyer orders will show up here for both sides." />
      ) : (
        orders.map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`}>
            <Card className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-2xl text-forest">
                  {order.listing?.crop ?? 'Produce'}
                </p>
                <p className="text-sm text-ink/70">
                  {formatQty(order.quantity, order.unit)} · {formatMoney(order.priceTotal)} ·{' '}
                  {formatDate(order.createdAt)}
                </p>
              </div>
              <Badge tone={tones[order.status]}>{titleCase(order.status)}</Badge>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <RequireAuth>
      <OrdersList />
    </RequireAuth>
  );
}
