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
