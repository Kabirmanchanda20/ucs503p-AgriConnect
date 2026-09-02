import { Router } from 'express';
import { requireActiveAccount } from '../../middleware/require-active-account.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { roleGuard } from '../../middleware/role-guard.js';
import { validate } from '../../middleware/validate.js';
import {
  createOrderController,
  getOrderController,
  listOrdersController,
  updateOrderStatusController,
} from './orders.controller.js';
import {
  createMessageController,
  listMessagesController,
  markMessagesReadController,
} from '../messages/messages.controller.js';
import {
  createMessageBodySchema,
  listMessagesQuerySchema,
} from '../messages/messages.schema.js';
import {
  createOrderBodySchema,
  listOrdersQuerySchema,
  orderIdParamsSchema,
  updateOrderStatusBodySchema,
} from './orders.schema.js';

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.post(
  '/',
  roleGuard('BUYER'),
  requireActiveAccount,
  validate({ body: createOrderBodySchema }),
  createOrderController,
);
ordersRouter.get('/', validate({ query: listOrdersQuerySchema }), listOrdersController);
ordersRouter.get(
  '/:id',
  validate({ params: orderIdParamsSchema }),
  getOrderController,
);
ordersRouter.patch(
  '/:id/status',
  requireActiveAccount,
  validate({ params: orderIdParamsSchema, body: updateOrderStatusBodySchema }),
  updateOrderStatusController,
);

ordersRouter.get(
  '/:id/messages',
  validate({ params: orderIdParamsSchema, query: listMessagesQuerySchema }),
  listMessagesController,
);

ordersRouter.post(
  '/:id/messages',
  requireActiveAccount,
  validate({ params: orderIdParamsSchema, body: createMessageBodySchema }),
  createMessageController,
);

ordersRouter.post(
  '/:id/messages/read',
  requireActiveAccount,
  validate({ params: orderIdParamsSchema }),
  markMessagesReadController,
);
