import type {
  NotificationType,
  Prisma,
  PrismaClient,
} from '../generated/prisma/client.js';
import { getPrismaClient } from '../config/db.js';

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export function createNotification(
  input: CreateNotificationInput,
  database: DatabaseClient = getPrismaClient(),
) {
  return database.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
    },
  });
}

export function createNotifications(
  inputs: readonly CreateNotificationInput[],
  database: DatabaseClient = getPrismaClient(),
) {
  return database.notification.createMany({
    data: inputs.map((input) => ({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
    })),
  });
}
