import type { Prisma, Role } from '../../generated/prisma/client.js';
import { AppError } from '../../common/app-error.js';
import { moneyString, quantityString, roundMoney, toDecimal } from '../../common/decimal.js';
import { getPrismaClient } from '../../config/db.js';
import {
  createNotification,
  createNotifications,
} from '../../services/notification.service.js';
import { listingStatusAfterQuantity, restoreListingStock } from './inventory.js';
import { canTransitionOrder } from './order-state-machine.js';
import type {
  CreateOrderInput,
  ListOrdersQuery,
  UpdateOrderStatusInput,
} from './orders.schema.js';

const orderInclude = {
  listing: {
    select: {
      id: true,
      crop: true,
      status: true,
      photos: {
        select: { id: true, publicUrl: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' as const },
      },
    },
  },
  buyer: { select: { id: true, name: true } },
  farmer: { select: { id: true, name: true } },
} satisfies Prisma.OrderInclude;

interface AuthenticatedActor {
  id: string;
  role: Role;
}

function serializeOrder(
  order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>,
) {
  return {
    id: order.id,
    listingId: order.listingId,
    buyerId: order.buyerId,
    farmerId: order.farmerId,
    quantity: quantityString(order.quantity),
    unit: order.unit,
    pricePerUnit: moneyString(order.pricePerUnit),
    priceTotal: moneyString(order.priceTotal),
    status: order.status,
    deliveryMode: order.deliveryMode,
    notes: order.notes,
    cancellationReason: order.cancellationReason,
    listing: order.listing,
    buyer: order.buyer,
    farmer: order.farmer,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export async function createOrder(buyerId: string, input: CreateOrderInput) {
  const quantity = toDecimal(input.quantity);
  if (quantity.lessThanOrEqualTo(0)) {
    throw new AppError(400, 'INVALID_REQUEST', 'Quantity must be greater than zero');
  }

  const created = await getPrismaClient().$transaction(async (transaction) => {
    const listing = await transaction.listing.findFirst({
      where: { id: input.listingId, status: 'active', deletedAt: null },
      include: {
        farmerProfile: { select: { userId: true } },
      },
    });

    if (!listing) {
      throw new AppError(404, 'NOT_FOUND', 'Listing not found');
    }
    if (listing.farmerProfile.userId === buyerId) {
      throw new AppError(400, 'INVALID_REQUEST', 'Cannot order your own listing');
    }
    if (quantity.lessThan(listing.minimumOrderQuantity)) {
      throw new AppError(
        400,
        'INVALID_REQUEST',
        'Quantity is below the minimum order quantity',
      );
    }

    const reserved = await transaction.listing.updateMany({
      where: {
        id: listing.id,
        status: 'active',
        deletedAt: null,
        quantity: { gte: quantity },
      },
      data: {
        quantity: { decrement: quantity },
        interestCount: { increment: 1 },
      },
    });
    if (reserved.count === 0) {
      throw new AppError(409, 'CONFLICT', 'Insufficient remaining quantity');
    }

    const remaining = listing.quantity.minus(quantity);
    const nextStatus = listingStatusAfterQuantity(
      remaining,
      listing.minimumOrderQuantity,
      listing.status,
    );
    if (nextStatus !== listing.status) {
      await transaction.listing.update({
        where: { id: listing.id },
        data: { status: nextStatus },
      });
    }

    const order = await transaction.order.create({
      data: {
        listingId: listing.id,
        buyerId,
        farmerId: listing.farmerProfile.userId,
        quantity,
        unit: listing.unit,
        pricePerUnit: listing.pricePerUnit,
        priceTotal: roundMoney(quantity.mul(listing.pricePerUnit)),
        deliveryMode: input.deliveryMode,
        notes: input.notes ?? null,
      },
      include: orderInclude,
    });

    await createNotification(
      {
        userId: order.farmerId,
        type: 'ORDER_PLACED',
        title: 'New order',
        body: `A buyer ordered ${quantityString(quantity)} ${listing.unit} of ${listing.crop}.`,
        relatedEntityType: 'Order',
        relatedEntityId: order.id,
      },
      transaction,
    );

    return order;
  });

  return serializeOrder(created);
}

export async function listOrders(actor: AuthenticatedActor, query: ListOrdersQuery) {
  const where: Prisma.OrderWhereInput = {};
  if (actor.role === 'BUYER') {
    where.buyerId = actor.id;
  } else if (actor.role === 'FARMER') {
    where.farmerId = actor.id;
  }
  if (query.status) {
    where.status = query.status;
  }

  const skip = (query.page - 1) * query.limit;
  const [orders, total] = await getPrismaClient().$transaction([
    getPrismaClient().order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: query.limit,
    }),
    getPrismaClient().order.count({ where }),
  ]);

  return {
    orders: orders.map(serializeOrder),
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 0,
    },
  };
}

export async function getOrder(actor: AuthenticatedActor, orderId: string) {
  const order = await getPrismaClient().order.findFirst({
    where: {
      id: orderId,
      ...(actor.role === 'BUYER'
        ? { buyerId: actor.id }
        : actor.role === 'FARMER'
          ? { farmerId: actor.id }
          : {}),
    },
    include: orderInclude,
  });
  if (!order) {
    throw new AppError(404, 'NOT_FOUND', 'Order not found');
  }
  return serializeOrder(order);
}

export async function updateOrderStatus(
  actor: AuthenticatedActor,
  orderId: string,
  input: UpdateOrderStatusInput,
) {
  const updated = await getPrismaClient().$transaction(async (transaction) => {
    const order = await transaction.order.findFirst({
      where: {
        id: orderId,
        ...(actor.role === 'BUYER'
          ? { buyerId: actor.id }
          : actor.role === 'FARMER'
            ? { farmerId: actor.id }
            : {}),
      },
    });
    if (!order) {
      throw new AppError(404, 'NOT_FOUND', 'Order not found');
    }

    if (
      !canTransitionOrder(order.status, input.status, {
        role: actor.role,
        isBuyerOwner: order.buyerId === actor.id,
        isFarmerOwner: order.farmerId === actor.id,
      })
    ) {
      throw new AppError(400, 'INVALID_REQUEST', 'Order status transition is not allowed');
    }

    if (input.status === 'cancelled') {
      await restoreListingStock(transaction, order.listingId, order.quantity);
    }

    const next = await transaction.order.update({
      where: { id: order.id },
      data: {
        status: input.status,
        cancellationReason:
          input.status === 'cancelled'
            ? (input.cancellationReason ?? null)
            : null,
      },
      include: orderInclude,
    });

    await createNotifications(
      [order.buyerId, order.farmerId].map((userId) => ({
        userId,
        type: 'ORDER_STATUS_CHANGED' as const,
        title: 'Order status updated',
        body: `Order status changed from ${order.status} to ${input.status}.`,
        relatedEntityType: 'Order',
        relatedEntityId: order.id,
      })),
      transaction,
    );
    return next;
  });

  return serializeOrder(updated);
}
