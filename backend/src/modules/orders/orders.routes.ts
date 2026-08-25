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
