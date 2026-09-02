'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RequireAuth } from '@/features/auth/guards';
import { OrderChat } from '@/features/messages/OrderChat';
import { OrderReviewSection } from '@/features/reviews/OrderReviewSection';
import { useAuth } from '@/features/auth/auth-context';
import { Alert, Badge, Button, Card, Field, Spinner, Textarea } from '@/components/ui';
import { getOrder, updateOrderStatus } from '@/lib/api/orders';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDate, formatMoney, formatQty, titleCase } from '@/lib/format';
import type { Order, OrderStatus } from '@/lib/api/types';

function nextActions(order: Order, userId: string, role: string) {
  const actions: Array<{ status: OrderStatus; label: string; needsReason?: boolean }> = [];
  if (role === 'FARMER' && order.farmerId === userId) {
    if (order.status === 'pending') actions.push({ status: 'accepted', label: 'Accept order' });
    if (order.status === 'accepted') actions.push({ status: 'confirmed', label: 'Confirm' });
    if (order.status === 'confirmed') actions.push({ status: 'fulfilled', label: 'Mark fulfilled' });
    if (['pending', 'accepted', 'confirmed'].includes(order.status)) {
      actions.push({ status: 'cancelled', label: 'Cancel', needsReason: true });
    }
  }
  if (role === 'BUYER' && order.buyerId === userId && order.status === 'pending') {
    actions.push({ status: 'cancelled', label: 'Cancel order', needsReason: true });
  }
  if (role === 'ADMIN' && ['pending', 'accepted', 'confirmed'].includes(order.status)) {
    actions.push({ status: 'cancelled', label: 'Admin cancel', needsReason: true });
  }
  return actions;
}

function OrderDetail() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void getOrder(params.id)
      .then((result) => setOrder(result.data))
      .catch((cause) => setError(getErrorMessage(cause)));
  }, [params.id]);

  async function changeStatus(status: OrderStatus, form?: FormData) {
    if (!order) return;
    setPending(true);
    setError('');
    try {
      const { data } = await updateOrderStatus(order.id, {
        status,
        cancellationReason:
          status === 'cancelled' ? String(form?.get('cancellationReason') ?? '') : undefined,
      });
      setOrder(data);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  if (error && !order) return <Alert>{error}</Alert>;
  if (!order || !user) return <Spinner />;

  const actions = nextActions(order, user.id, user.role);
  const counterparty =
    user.id === order.buyerId
      ? { name: order.farmer?.name ?? 'Farmer', id: order.farmerId }
      : { name: order.buyer?.name ?? 'Buyer', id: order.buyerId };
  const counterpartyRating =
    user.id === order.buyerId ? order.farmer?.ratingAvg : order.buyer?.ratingAvg;
  const chatDisabled = order.status === 'cancelled';

  return (
    <div className="space-y-6">
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl text-forest">
          {order.listing?.crop ?? 'Order'}
        </h1>
        <Badge>{titleCase(order.status)}</Badge>
      </div>
      <p>
        {formatQty(order.quantity, order.unit)} at {formatMoney(order.pricePerUnit)} / {order.unit}
      </p>
      <p className="text-2xl font-bold text-forest">{formatMoney(order.priceTotal)}</p>
      <p>Delivery: {order.deliveryMode}</p>
      <p>Placed {formatDate(order.createdAt)}</p>
      {order.notes ? <p>Notes: {order.notes}</p> : null}
      {order.cancellationReason ? <p>Cancelled: {order.cancellationReason}</p> : null}
      {error ? <Alert>{error}</Alert> : null}
      <div className="flex flex-col gap-3">
        {actions.map((action) =>
          action.needsReason ? (
            <form
              key={action.status}
              className="space-y-2 rounded-xl border border-forest/10 p-3"
              action={(form) => void changeStatus(action.status, form)}
            >
              <Field label="Cancellation reason">
                <Textarea name="cancellationReason" required />
              </Field>
              <Button type="submit" variant="danger" disabled={pending}>
                {action.label}
              </Button>
            </form>
          ) : (
            <Button
              key={action.status}
              type="button"
              disabled={pending}
              onClick={() => void changeStatus(action.status)}
            >
              {action.label}
            </Button>
          ),
        )}
      </div>
    </Card>

    <OrderChat orderId={order.id} userId={user.id} disabled={chatDisabled} />

    {order.status === 'fulfilled' ? (
      <OrderReviewSection
        orderId={order.id}
        counterpartyName={counterparty.name}
        counterpartyRating={counterpartyRating}
      />
    ) : null}
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <RequireAuth>
      <OrderDetail />
    </RequireAuth>
  );
}
