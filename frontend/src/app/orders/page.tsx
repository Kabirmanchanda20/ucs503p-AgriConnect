'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { RequireAuth } from '@/features/auth/guards';
import { Badge, Card, EmptyState, Spinner, Alert } from '@/components/ui';
import { listOrders } from '@/lib/api/orders';
import { getErrorMessage } from '@/lib/api/errors';
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
  const [error, setError] = useState('');

  useEffect(() => {
    void listOrders({ limit: 50 })
      .then((result) => setOrders(result.data))
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!orders) return <Spinner />;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl text-forest">Orders</h1>
      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          body="When a buyer places an order on your listing, it appears here. Open any order to chat with the buyer in real time. For farm advice, use Kisan AI in the header or the Ask Kisan button at the bottom-right."
        />
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
                <p className="mt-1 text-sm font-semibold text-leaf">Open order → chat with buyer</p>
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
