import { AppError } from '../../common/app-error.js';
import { moneyString } from '../../common/decimal.js';
import { getEnv } from '../../config/env.js';
import { getPrismaClient } from '../../config/db.js';

export async function initOrderPayment(orderId: string, buyerId: string) {
  const order = await getPrismaClient().order.findFirst({
    where: { id: orderId, buyerId },
    include: { payment: true },
  });
  if (!order) {
    throw new AppError(404, 'NOT_FOUND', 'Order not found');
  }
  if (order.status === 'cancelled') {
    throw new AppError(400, 'INVALID_REQUEST', 'Cannot pay for a cancelled order');
  }

  const amount = moneyString(order.priceTotal);
  const env = getEnv();

  const payment =
    order.payment ??
    (await getPrismaClient().payment.create({
      data: {
        orderId: order.id,
        amount: order.priceTotal,
        status: 'pending',
        provider: 'razorpay',
      },
    }));

  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return {
      paymentId: payment.id,
      orderId: order.id,
      amount,
      currency: 'INR',
      status: payment.status,
      mode: 'mock' as const,
      message:
        'Razorpay keys are not configured. Payment is simulated — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET for sandbox checkout.',
    };
  }

  const amountPaise = Math.round(Number(amount) * 100);
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(
        `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`,
      ).toString('base64')}`,
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: 'INR',
      receipt: order.id,
      notes: { orderId: order.id },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    error?: { description?: string };
  };

  if (!response.ok || !payload.id) {
    throw new AppError(
      502,
      'PAYMENT_UNAVAILABLE',
      payload.error?.description ?? 'Could not create Razorpay order',
    );
  }

  await getPrismaClient().payment.update({
    where: { id: payment.id },
    data: { providerRef: payload.id, status: 'authorized' },
  });

  return {
    paymentId: payment.id,
    orderId: order.id,
    amount,
    currency: 'INR',
    status: 'authorized',
    mode: 'razorpay' as const,
    razorpayOrderId: payload.id,
    keyId: env.RAZORPAY_KEY_ID,
  };
}

export async function markPaymentHeld(orderId: string, buyerId: string) {
  const payment = await getPrismaClient().payment.findFirst({
    where: { orderId, order: { buyerId } },
  });
  if (!payment) {
    throw new AppError(404, 'NOT_FOUND', 'Payment not found');
  }
  const updated = await getPrismaClient().payment.update({
    where: { id: payment.id },
    data: { status: 'held', heldAt: new Date() },
  });
  return {
    id: updated.id,
    status: updated.status,
    heldAt: updated.heldAt?.toISOString() ?? null,
  };
}
