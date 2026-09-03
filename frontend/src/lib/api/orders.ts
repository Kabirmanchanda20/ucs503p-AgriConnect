import { apiRequest } from './client';
import type { DeliveryMode, Order, OrderStatus } from './types';

export function createOrder(body: {
  listingId: string;
  quantity: string;
  deliveryMode: DeliveryMode;
  notes?: string;
}) {
  return apiRequest<Order>('/api/v1/orders', { method: 'POST', body });
}

export function listOrders(query: { status?: OrderStatus; page?: number; limit?: number } = {}) {
  return apiRequest<Order[]>('/api/v1/orders', { query });
}

export function getOrder(id: string) {
  return apiRequest<Order>(`/api/v1/orders/${id}`);
}

export function updateOrderStatus(
  id: string,
  body: { status: OrderStatus; cancellationReason?: string | null },
) {
  return apiRequest<Order>(`/api/v1/orders/${id}/status`, {
    method: 'PATCH',
    body,
  });
}

export function updateOrderLogistics(
  id: string,
  body: { logisticsStatus: 'dispatched' | 'in_transit' | 'delivered' },
) {
  return apiRequest<Order>(`/api/v1/orders/${id}/logistics`, {
    method: 'PATCH',
    body,
  });
}

export function initOrderPayment(id: string) {
  return apiRequest<{
    paymentId: string;
    orderId: string;
    amount: string;
    currency: string;
    status: string;
    mode: 'mock' | 'razorpay';
    message?: string;
    razorpayOrderId?: string;
    keyId?: string;
  }>(`/api/v1/orders/${id}/payment`, { method: 'POST' });
}

export function confirmOrderPaymentHeld(id: string) {
  return apiRequest<{ id: string; status: string; heldAt: string | null }>(
    `/api/v1/orders/${id}/payment/confirm`,
    { method: 'POST' },
  );
}
