'use client';

import type { Order } from '@/lib/api/types';
import { formatDate, formatMoney } from '@/lib/format';

type StepState = 'complete' | 'current' | 'upcoming' | 'cancelled';

interface TimelineStep {
  id: string;
  label: string;
  state: StepState;
  detail?: string;
}

const MAIN_LABELS = ['Placed', 'Accepted', 'Confirmed', 'Fulfilled'] as const;

function mainStepState(stepIndex: number, order: Order): StepState {
  if (order.status === 'cancelled') {
    return stepIndex === 0 ? 'complete' : 'upcoming';
  }
  const statusIndex = { pending: 0, accepted: 1, confirmed: 2, fulfilled: 3 }[order.status] ?? 0;
  if (stepIndex < statusIndex) return 'complete';
  if (stepIndex === statusIndex) return 'current';
  return 'upcoming';
}

function paymentSteps(order: Order): TimelineStep[] | null {
  const payment = order.payment;
  if (!payment && order.status === 'cancelled') return null;

  const steps: TimelineStep[] = [
    { id: 'pay-pending', label: 'Payment', state: 'upcoming' },
    { id: 'pay-held', label: 'Escrow held', state: 'upcoming' },
    { id: 'pay-released', label: 'Released', state: 'upcoming' },
  ];

  if (!payment) {
    steps[0].state = order.status === 'pending' ? 'current' : 'upcoming';
    steps[0].detail = 'Awaiting buyer payment';
    return steps;
  }

  const status = payment.status;
  if (status === 'pending' || status === 'authorized') {
    steps[0].state = 'current';
    steps[0].detail = formatMoney(payment.amount);
  } else if (status === 'held') {
    steps[0].state = 'complete';
    steps[1].state = 'current';
    steps[1].detail = formatMoney(payment.amount);
  } else if (status === 'released') {
    steps[0].state = 'complete';
    steps[1].state = 'complete';
    steps[2].state = 'complete';
    steps[2].detail = formatMoney(payment.amount);
  } else if (status === 'refunded' || status === 'failed') {
    steps[0].state = 'complete';
    steps[1].state = 'cancelled';
    steps[1].detail = status;
    return steps;
  }

  return steps;
}

function logisticsSteps(order: Order): TimelineStep[] | null {
  if (order.deliveryMode !== 'delivery') return null;
  if (order.status === 'cancelled') return null;

  const logistics = order.logisticsStatus ?? 'none';
  const steps: TimelineStep[] = [
    { id: 'log-dispatched', label: 'Dispatched', state: 'upcoming', detail: order.dispatchedAt ? formatDate(order.dispatchedAt) : undefined },
    { id: 'log-transit', label: 'In transit', state: 'upcoming', detail: order.inTransitAt ? formatDate(order.inTransitAt) : undefined },
    { id: 'log-delivered', label: 'Delivered', state: 'upcoming', detail: order.logisticsDeliveredAt ? formatDate(order.logisticsDeliveredAt) : undefined },
  ];

  const rank = { none: -1, dispatched: 0, in_transit: 1, delivered: 2 }[logistics] ?? -1;

  steps.forEach((step, index) => {
    if (rank > index) step.state = 'complete';
    else if (rank === index) step.state = 'current';
    else step.state = 'upcoming';
  });

  if (logistics === 'none' && ['pending', 'accepted'].includes(order.status)) {
    steps[0].state = 'upcoming';
    steps[0].detail = 'After confirmation';
  }

  return steps;
}

function StepDot({ state }: { state: StepState }) {
  const styles = {
    complete: 'border-leaf bg-leaf text-cream',
    current: 'border-harvest bg-harvest/20 text-forest ring-2 ring-harvest/40',
    upcoming: 'border-forest/20 bg-cream text-ink/35',
    cancelled: 'border-clay bg-clay/15 text-clay',
  }[state];

  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold ${styles}`}
      aria-hidden
    >
      {state === 'complete' ? '✓' : state === 'cancelled' ? '!' : ''}
    </span>
  );
}

function StepRow({ title, steps }: { title: string; steps: TimelineStep[] }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-soil">{title}</p>
      <ol className="flex flex-wrap items-start gap-y-3">
        {steps.map((step, index) => (
          <li key={step.id} className="flex min-w-0 flex-1 items-center">
            <div className="flex min-w-[4.5rem] flex-col items-center gap-1 px-1 text-center sm:min-w-[5.5rem]">
              <StepDot state={step.state} />
              <span
                className={`text-xs font-semibold leading-tight ${
                  step.state === 'current' ? 'text-forest' : step.state === 'complete' ? 'text-leaf' : 'text-ink/45'
                }`}
              >
                {step.label}
              </span>
              {step.detail ? <span className="text-[10px] text-ink/50">{step.detail}</span> : null}
            </div>
            {index < steps.length - 1 ? (
              <div
                className={`mx-1 h-0.5 min-w-[1rem] flex-1 rounded-full ${
                  step.state === 'complete' ? 'bg-leaf/60' : 'bg-forest/12'
                }`}
                aria-hidden
              />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function OrderTimeline({ order }: { order: Order }) {
  const mainSteps: TimelineStep[] = MAIN_LABELS.map((label, index) => ({
    id: `main-${index}`,
    label: order.status === 'cancelled' && index === MAIN_LABELS.length - 1 ? 'Cancelled' : label,
    state:
      order.status === 'cancelled' && index === MAIN_LABELS.length - 1
        ? 'cancelled'
        : mainStepState(index, order),
    detail:
      index === 0 && order.createdAt
        ? formatDate(order.createdAt)
        : order.status === 'cancelled' && index === MAIN_LABELS.length - 1 && order.cancellationReason
          ? order.cancellationReason.slice(0, 40)
          : undefined,
  }));

  const payment = paymentSteps(order);
  const logistics = logisticsSteps(order);

  return (
    <div className="space-y-5 rounded-xl border border-forest/10 bg-forest/[0.03] p-4">
      <div>
        <h2 className="font-display text-lg text-forest">Order timeline</h2>
        <p className="text-sm text-ink/55">Track status, escrow, and delivery on this order.</p>
      </div>
      <StepRow title="Order" steps={mainSteps} />
      {payment ? <StepRow title="Payment" steps={payment} /> : null}
      {logistics ? <StepRow title="Delivery" steps={logistics} /> : null}
    </div>
  );
}
